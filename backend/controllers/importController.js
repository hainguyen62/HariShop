import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Product from '../models/productModel.js'
import StockImport from '../models/stockImportModel.js'
import logger from '../utils/logger.js'
import { escapeRegex, dateRange, numRange, sortDirection, pageParams, pagesOf } from '../utils/listQuery.js'
import { nextLotCode, LOT_CODE_RE } from '../utils/orderCode.js'
import { ensureProductCode, createUnits } from '../utils/units.js'
import { MAX_UNITS_PER_IMPORT } from '../utils/unitCode.js'
import { validateImportInput, resolveStockTarget, computeImportTotal } from '../utils/stockImport.js'

const SORTABLE_IMPORT_FIELDS = new Set([
  'lotCode', 'importedAt', 'productName', 'color', 'quantity', 'unitCost', 'totalCost', 'supplier', 'createdAt',
])

export const buildImportFilter = ({ startDate, endDate, productId, keyword, color, supplier, minCost, maxCost, minQty, maxQty }) => {
  const filter = {}
  const range = dateRange(startDate, endDate)
  if (range) filter.importedAt = range
  if (productId && mongoose.Types.ObjectId.isValid(productId)) filter.product = productId
  if (keyword) {
    const rx = new RegExp(escapeRegex(keyword), 'i')
    filter.$or = [{ productName: rx }, { supplier: rx }, { lotCode: rx }]
  }
  if (color) filter.color = new RegExp(escapeRegex(color), 'i')
  if (supplier) filter.supplier = new RegExp(escapeRegex(supplier), 'i')
  const cost = numRange(minCost, maxCost)
  if (cost) filter.unitCost = cost
  const qty = numRange(minQty, maxQty)
  if (qty) filter.quantity = qty
  return filter
}

// @desc    Danh sách sản phẩm rút gọn để chọn khi nhập hàng
// @route   GET /api/imports/products
// @access  Private/Admin
const getImportProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({})
    .select('name brand price countInStock colors.name colors.countInStock colors.hexCode')
    .sort({ name: 1 })
    .lean()
  res.json(products)
})

// @desc    Giá nhập gần nhất của sản phẩm (và màu) để điền sẵn vào form
// @route   GET /api/imports/last-cost?productId=&color=
// @access  Private/Admin
const getLastImportCost = asyncHandler(async (req, res) => {
  const { productId, color } = req.query
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400)
    throw new Error('productId không hợp lệ')
  }
  const filter = { product: productId }
  if (color) filter.color = color
  const last = await StockImport.findOne(filter).sort({ importedAt: -1, createdAt: -1 }).lean()
  res.json(last ? { unitCost: last.unitCost, importedAt: last.importedAt } : null)
})

// @desc    Tạo phiếu nhập hàng và cộng tồn kho (cùng 1 transaction)
// @route   POST /api/imports
// @access  Private/Admin
const createStockImport = asyncHandler(async (req, res) => {
  const { productId, color, quantity, unitCost, supplier, note, importedAt } = req.body
  const reuseLot = String(req.body.lotCode || '').trim().toUpperCase()

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400)
    throw new Error('Vui lòng chọn sản phẩm')
  }
  const inputError = validateImportInput({ quantity, unitCost, importedAt })
  if (inputError) {
    res.status(400)
    throw new Error(inputError)
  }

  if (reuseLot) {
    if (!LOT_CODE_RE.test(reuseLot) || !(await StockImport.exists({ lotCode: reuseLot }))) {
      res.status(400)
      throw new Error('Mã lô không tồn tại, để trống để tạo lô mới')
    }
  }

  const qty = Number(quantity)
  const cost = Number(unitCost)

  // Cấp mã sản phẩm trước khi mở transaction, vì bước này ghi vào chính sản phẩm
  const pre = await Product.findById(productId).select('name productCode')
  if (pre) await ensureProductCode(pre)

  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const product = await Product.findById(productId).session(session)
    if (!product) {
      const err = new Error('Không tìm thấy sản phẩm')
      err.statusCode = 404
      throw err
    }

    const target = resolveStockTarget(product, color)
    if (target.error) {
      const err = new Error(target.error)
      err.statusCode = 400
      throw err
    }

    const update = target.hasColors
      ? { $inc: { 'colors.$[c].countInStock': qty, countInStock: qty } }
      : { $inc: { countInStock: qty } }
    const options = target.hasColors
      ? { session, arrayFilters: [{ 'c.name': target.color }] }
      : { session }

    const result = await Product.updateOne({ _id: product._id }, update, options)
    if (result.modifiedCount !== 1) throw new Error('Không cập nhật được tồn kho')

    const importDate = importedAt ? new Date(importedAt) : new Date()
    const lotCode = reuseLot || (await nextLotCode(importDate))

    const [record] = await StockImport.create(
      [{
        lotCode,
        product: product._id,
        productName: product.name,
        color: target.color,
        quantity: qty,
        unitCost: cost,
        totalCost: computeImportTotal(qty, cost),
        supplier: (supplier || '').trim(),
        note: (note || '').trim(),
        importedAt: importDate,
        stockBefore: target.stockBefore,
        stockAfter: target.stockBefore + qty,
        createdBy: req.user?._id,
      }],
      { session }
    )

    // Sinh tem đơn vị cho từng chiếc nhập về (bỏ qua nếu số lượng quá lớn)
    if (qty <= MAX_UNITS_PER_IMPORT) {
      await createUnits({
        product, color: target.color, quantity: qty, lotCode, importRecord: record._id, importedAt: importDate, session,
      })
      record.unitsGenerated = qty
      await record.save({ session })
    }

    await session.commitTransaction()
    logger.info(`Nhập hàng: ${product.name} ${target.color} +${qty} (${target.stockBefore} → ${target.stockBefore + qty})`)
    res.status(201).json(record)
  } catch (e) {
    await session.abortTransaction()
    res.status(e.statusCode || 500)
    throw new Error(e.message || 'Không thể tạo phiếu nhập')
  } finally {
    session.endSession()
  }
})

// @desc    Danh sách phiếu nhập (lọc theo ngày/sản phẩm/từ khoá) + tổng kết
// @route   GET /api/imports?startDate=&endDate=&productId=&keyword=&page=
// @access  Private/Admin
const getStockImports = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = pageParams(req.query.page)
  const filter = buildImportFilter(req.query)
  const dir = sortDirection(req.query.order)
  const sort =
    SORTABLE_IMPORT_FIELDS.has(req.query.sortBy) && dir !== null
      ? { [req.query.sortBy]: dir, _id: 1 }
      : { importedAt: -1, createdAt: -1, _id: 1 }

  const [imports, [summary]] = await Promise.all([
    StockImport.find(filter)
      .populate('createdBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .lean(),
    StockImport.aggregate([
      { $match: filter },
      { $group: { _id: null, totalCost: { $sum: '$totalCost' }, totalQty: { $sum: '$quantity' }, count: { $sum: 1 } } },
    ]),
  ])

  const total = summary?.count || 0
  res.json({
    imports,
    page,
    pages: pagesOf(total, pageSize),
    summary: { totalCost: summary?.totalCost || 0, totalQty: summary?.totalQty || 0, count: total },
  })
})

// @desc    Huỷ phiếu nhập (trừ lại tồn kho nếu hàng chưa bị bán hết)
// @route   DELETE /api/imports/:id
// @access  Private/Admin
const deleteStockImport = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const record = await StockImport.findById(req.params.id).session(session)
    if (!record) {
      const err = new Error('Không tìm thấy phiếu nhập')
      err.statusCode = 404
      throw err
    }

    const product = await Product.findById(record.product).session(session)
    if (product) {
      const target = resolveStockTarget(product, record.color)
      if (target.error) {
        const err = new Error(`Không thể huỷ phiếu: ${target.error}`)
        err.statusCode = 400
        throw err
      }
      if (target.stockBefore < record.quantity) {
        const err = new Error(
          `Không thể huỷ phiếu: tồn kho hiện tại (${target.stockBefore}) ít hơn số lượng đã nhập (${record.quantity}), một phần hàng đã được bán`
        )
        err.statusCode = 400
        throw err
      }

      const update = target.hasColors
        ? { $inc: { 'colors.$[c].countInStock': -record.quantity, countInStock: -record.quantity } }
        : { $inc: { countInStock: -record.quantity } }
      const options = target.hasColors
        ? { session, arrayFilters: [{ 'c.name': target.color }] }
        : { session }
      await Product.updateOne({ _id: product._id }, update, options)
    }

    await record.deleteOne({ session })
    await session.commitTransaction()
    res.json({ message: 'Đã huỷ phiếu nhập' })
  } catch (e) {
    await session.abortTransaction()
    res.status(e.statusCode || 500)
    throw new Error(e.message || 'Không thể huỷ phiếu nhập')
  } finally {
    session.endSession()
  }
})

export { getImportProducts, getLastImportCost, createStockImport, getStockImports, deleteStockImport }
