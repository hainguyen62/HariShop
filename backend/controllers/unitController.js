import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Product from '../models/productModel.js'
import StockUnit from '../models/stockUnitModel.js'
import { resolveStockTarget } from '../utils/stockImport.js'
import { ensureProductCode, createUnits } from '../utils/units.js'
import { MAX_UNITS_PER_GENERATE } from '../utils/unitCode.js'

// @desc    Sinh thêm tem đơn vị (cho hàng tồn có sẵn hoặc in bù)
// @route   POST /api/units/generate
// @access  Private/Admin
const generateUnits = asyncHandler(async (req, res) => {
  const { productId, color, quantity, compensate, reason } = req.body
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400)
    throw new Error('Vui lòng chọn sản phẩm')
  }
  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_UNITS_PER_GENERATE) {
    res.status(400)
    throw new Error(`Số lượng tem phải từ 1 đến ${MAX_UNITS_PER_GENERATE}`)
  }
  const product = await Product.findById(productId).select('name productCode colors.name colors.countInStock countInStock')
  if (!product) {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }
  const target = resolveStockTarget(product, color)
  if (target.error) {
    res.status(400)
    throw new Error(target.error)
  }
  const stock = target.stockBefore
  const inStock = await StockUnit.countDocuments({ product: product._id, color: target.color || '', status: 'in_stock' })
  if (inStock + qty > stock) {
    const note = String(reason || '').trim()
    if (!compensate || !note) {
      res.status(400)
      throw new Error(`Tồn kho ${stock}, đã có ${inStock} tem còn trong kho, sinh thêm ${qty} sẽ vượt tồn. Chỉ in thêm tối đa ${Math.max(0, stock - inStock)} tem, hoặc tick "in bù tem hỏng/mất" và ghi lý do.`)
    }
  }
  await ensureProductCode(product)
  const units = await createUnits({ product, color: target.color, quantity: qty })
  if (inStock + qty > stock) {
    await StockUnit.updateMany({ code: { $in: units.map((u) => u.code) } }, { $set: { note: `In bù: ${String(reason).trim()}` } })
  }
  res.status(201).json({ units })
})

// @desc    Danh sách tem theo lô hoặc sản phẩm
// @route   GET /api/units?lotCode=&productId=&color=&limit=
// @access  Private/Admin
const getUnits = asyncHandler(async (req, res) => {
  const filter = {}
  const lot = String(req.query.lotCode || '').trim().toUpperCase()
  if (lot) filter.lotCode = lot
  if (req.query.productId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.productId)) {
      res.status(400)
      throw new Error('Mã sản phẩm không hợp lệ')
    }
    filter.product = req.query.productId
  }
  if (req.query.color !== undefined && req.query.color !== '') filter.color = String(req.query.color)
  if (['in_stock', 'sold', 'void'].includes(req.query.status)) filter.status = req.query.status
  if (!lot && !filter.product) {
    res.status(400)
    throw new Error('Cần chọn lô hoặc sản phẩm')
  }
  const limit = Math.min(Number(req.query.limit) || 500, 1000)
  const units = await StockUnit.find(filter)
    .sort({ code: 1 })
    .limit(limit)
    .populate('product', 'name')
    .lean()
  res.json(units.map((u) => ({
    code: u.code, status: u.status || 'in_stock', color: u.color, lotCode: u.lotCode, productCode: u.productCode, productName: u.product?.name || '',
  })))
})

// @desc    Số tồn và số tem đã sinh theo từng màu của một sản phẩm
// @route   GET /api/units/product/:id
// @access  Private/Admin
const getUnitSummary = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400)
    throw new Error('Mã sản phẩm không hợp lệ')
  }
  const product = await Product.findById(req.params.id).select('name productCode colors.name colors.countInStock countInStock').lean()
  if (!product) {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }
  const grouped = await StockUnit.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: { color: '$color', status: '$status' }, n: { $sum: 1 } } },
  ])
  const unitsBy = new Map()
  const soldBy = new Map()
  for (const g of grouped) {
    const st = g._id.status || 'in_stock'
    if (st === 'in_stock') unitsBy.set(g._id.color, (unitsBy.get(g._id.color) || 0) + g.n)
    if (st === 'sold') soldBy.set(g._id.color, (soldBy.get(g._id.color) || 0) + g.n)
  }
  const hasColors = Array.isArray(product.colors) && product.colors.length > 0
  const colors = hasColors
    ? product.colors.map((c) => ({ color: c.name, stock: c.countInStock || 0, units: unitsBy.get(c.name) || 0, sold: soldBy.get(c.name) || 0 }))
    : [{ color: '', stock: product.countInStock || 0, units: unitsBy.get('') || 0, sold: soldBy.get('') || 0 }]
  res.json({ name: product.name, productCode: product.productCode || '', colors })
})

// @desc    Đánh dấu tem hỏng/mất để mở chỗ in bù; mã cũ không bao giờ dùng lại
// @route   PUT /api/units/void
// @access  Private/Admin
const voidUnits = asyncHandler(async (req, res) => {
  const codes = Array.isArray(req.body.codes) ? req.body.codes.map((c) => String(c).trim().toUpperCase()).filter(Boolean) : []
  const reason = String(req.body.reason || '').trim()
  if (codes.length === 0 || codes.length > 500) {
    res.status(400)
    throw new Error('Cần 1 đến 500 mã tem')
  }
  if (!reason) {
    res.status(400)
    throw new Error('Vui lòng ghi lý do')
  }
  const r = await StockUnit.updateMany(
    { code: { $in: codes }, status: 'in_stock' },
    { $set: { status: 'void', voidReason: reason } }
  )
  res.json({ voided: r.modifiedCount || 0 })
})

export { generateUnits, getUnits, getUnitSummary, voidUnits }
