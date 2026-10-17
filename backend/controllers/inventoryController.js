import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Product from '../models/productModel.js'
import Order from '../models/orderModel.js'
import StockImport from '../models/stockImportModel.js'
import InventorySetting, { getInventorySettings } from '../models/inventorySettingModel.js'
import { createNotification } from './notificationController.js'
import { buildAgingRow } from '../utils/stockAging.js'
import { escapeRegex, sortDirection, pageParams, pagesOf } from '../utils/listQuery.js'
import logger from '../utils/logger.js'

const ALERT_REPEAT_DAYS = 7
const DAY = 24 * 60 * 60 * 1000

export const computeAgingRows = async (now = new Date()) => {
  const settings = await getInventorySettings()
  const products = await Product.find({ countInStock: { $gt: 0 } })
    .select('name brand countInStock createdAt agingThresholdDays agingAlertedAt')
    .lean()
  const ids = products.map((p) => p._id)

  const [imports, sales] = await Promise.all([
    StockImport.find({ product: { $in: ids } }).select('product quantity importedAt lotCode').lean(),
    Order.aggregate([
      { $match: { isCancelled: { $ne: true }, status: { $nin: ['cancelled', 'returned'] } } },
      { $unwind: '$orderItems' },
      { $match: { 'orderItems.product': { $in: ids } } },
      { $group: { _id: '$orderItems.product', last: { $max: '$createdAt' } } },
    ]),
  ])

  const importMap = new Map()
  for (const im of imports) {
    const key = String(im.product)
    if (!importMap.has(key)) importMap.set(key, [])
    importMap.get(key).push({ date: im.importedAt, qty: im.quantity, lotCode: im.lotCode })
  }
  const saleMap = new Map(sales.map((s) => [String(s._id), s.last]))

  const rows = products.map((p) =>
    buildAgingRow({
      product: p,
      imports: importMap.get(String(p._id)) || [],
      lastSaleAt: saleMap.get(String(p._id)),
      globalThreshold: settings.agingThresholdDays,
      now,
    })
  )
  return { settings, rows }
}

const SORTABLE = new Set(['name', 'stock', 'ageDays', 'daysSinceSale', 'threshold', 'overBy'])

// @desc    Danh sách tồn kho theo tuổi tồn, kèm lọc, sắp xếp, phân trang
// @route   GET /api/inventory/aging
// @access  Private/Admin
const getAgingStock = asyncHandler(async (req, res) => {
  const { settings, rows } = await computeAgingRows()

  const kw = String(req.query.keyword || '').trim()
  const rx = kw ? new RegExp(escapeRegex(kw), 'i') : null
  const minDays = req.query.minDays !== undefined && req.query.minDays !== '' ? Number(req.query.minDays) : null
  const maxDays = req.query.maxDays !== undefined && req.query.maxDays !== '' ? Number(req.query.maxDays) : null

  let list = rows.filter((r) => {
    if (rx && !rx.test(r.name)) return false
    if (req.query.status === 'over' && !r.over) return false
    if (req.query.status === 'ok' && r.over) return false
    if (req.query.custom === 'yes' && !r.customThreshold) return false
    if (minDays !== null && Number.isFinite(minDays) && (r.ageDays ?? 0) < minDays) return false
    if (maxDays !== null && Number.isFinite(maxDays) && (r.ageDays ?? 0) > maxDays) return false
    return true
  })

  const dir = sortDirection(req.query.order)
  const sortKey = SORTABLE.has(req.query.sortBy) && dir !== null ? req.query.sortBy : 'ageDays'
  const mul = dir === null ? -1 : dir
  list = list.sort((a, b) => {
    const x = a[sortKey]
    const y = b[sortKey]
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    return (typeof x === 'string' ? x.localeCompare(y, 'vi') : x - y) * mul
  })

  const { page, pageSize, skip } = pageParams(req.query.pageNumber)
  res.json({
    items: list.slice(skip, skip + pageSize),
    page,
    pages: pagesOf(list.length, pageSize),
    total: list.length,
    summary: {
      overCount: rows.filter((r) => r.over).length,
      totalCount: rows.length,
      overStock: rows.filter((r) => r.over).reduce((s, r) => s + r.stock, 0),
    },
    settings: { agingThresholdDays: settings.agingThresholdDays },
  })
})

// @desc    Cấu hình kho dùng chung
// @route   GET/PUT /api/inventory/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  const s = await getInventorySettings()
  res.json({ agingThresholdDays: s.agingThresholdDays, leadTimeDays: s.leadTimeDays, coverDays: s.coverDays })
})

const updateSettings = asyncHandler(async (req, res) => {
  const update = {}
  for (const [key, max] of [['agingThresholdDays', 3650], ['leadTimeDays', 90], ['coverDays', 180]]) {
    if (req.body[key] === undefined) continue
    const n = Number(req.body[key])
    if (!Number.isInteger(n) || n < 1 || n > max) {
      res.status(400)
      throw new Error(`Giá trị "${key}" phải là số nguyên từ 1 đến ${max}`)
    }
    update[key] = n
  }
  await getInventorySettings()
  const s = await InventorySetting.findOneAndUpdate({ key: 'inventory' }, { $set: update }, { new: true })
  res.json({ agingThresholdDays: s.agingThresholdDays, leadTimeDays: s.leadTimeDays, coverDays: s.coverDays })
})

// @desc    Đặt ngưỡng riêng cho một sản phẩm (0 = dùng ngưỡng chung)
// @route   PUT /api/inventory/aging/:productId
// @access  Private/Admin
const setProductThreshold = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
    res.status(400)
    throw new Error('Mã sản phẩm không hợp lệ')
  }
  const n = Number(req.body.agingThresholdDays)
  if (!Number.isInteger(n) || n < 0 || n > 3650) {
    res.status(400)
    throw new Error('Ngưỡng phải là số nguyên từ 0 đến 3650 (0 là dùng ngưỡng chung)')
  }
  const result = await Product.updateOne({ _id: req.params.productId }, { $set: { agingThresholdDays: n, agingAlertedAt: null } })
  if (result.matchedCount !== 1) {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }
  res.json({ productId: req.params.productId, agingThresholdDays: n })
})

// Quét hằng ngày: gửi một thông báo tổng hợp cho admin, mỗi sản phẩm chỉ nhắc lại sau 7 ngày
export const runAgingScan = async (now = new Date()) => {
  const { rows } = await computeAgingRows(now)
  const fresh = rows
    .filter((r) => r.over && (!r.alertedAt || now - new Date(r.alertedAt) > ALERT_REPEAT_DAYS * DAY))
    .sort((a, b) => b.overBy - a.overBy)
  if (fresh.length === 0) return 0

  const names = fresh.slice(0, 3).map((r) => `${r.name} (${r.ageDays} ngày)`).join(', ')
  await createNotification({
    type: 'stock_aging',
    title: `${fresh.length} sản phẩm tồn kho quá ngưỡng`,
    message: `${names}${fresh.length > 3 ? ` và ${fresh.length - 3} sản phẩm khác` : ''}`,
    link: '/admin/aging-stock',
  })
  await Product.updateMany({ _id: { $in: fresh.map((r) => r.productId) } }, { $set: { agingAlertedAt: now } })
  logger.info(`[Aging] Đã cảnh báo ${fresh.length} sản phẩm tồn kho lâu`)
  return fresh.length
}

export { getAgingStock, getSettings, updateSettings, setProductThreshold }
