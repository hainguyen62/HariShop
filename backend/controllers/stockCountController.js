import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Product from '../models/productModel.js'
import StockCount from '../models/stockCountModel.js'
import logger from '../utils/logger.js'
import { buildCountLines } from '../utils/stockCount.js'
import { escapeRegex, dateRange, sortDirection, pageParams, pagesOf } from '../utils/listQuery.js'

const SORTABLE_FIELDS = new Set(['countedAt', 'productName', 'totalDiff'])

// @desc    Thông tin sản phẩm để kiểm kê (tồn hệ thống theo màu)
// @route   GET /api/stockcounts/product/:id
// @access  Private/Admin
const getCountProduct = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400)
    throw new Error('Mã sản phẩm không hợp lệ')
  }
  const product = await Product.findById(req.params.id)
    .select('name productCode image brand countInStock colors.name colors.hexCode colors.countInStock')
    .lean()
  if (!product) {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }
  const last = await StockCount.findOne({ product: product._id }).sort({ countedAt: -1 }).select('countedAt totalDiff').lean()
  res.json({ ...product, lastCount: last || null })
})

// @desc    Lưu phiếu kiểm kê, tuỳ chọn chỉnh tồn kho theo số đếm
// @route   POST /api/stockcounts
// @access  Private/Admin
const createStockCount = asyncHandler(async (req, res) => {
  const { productId, lines, note, applyAdjustment } = req.body
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400)
    throw new Error('Vui lòng chọn sản phẩm')
  }

  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const product = await Product.findById(productId).session(session)
    if (!product) {
      const err = new Error('Không tìm thấy sản phẩm')
      err.statusCode = 404
      throw err
    }

    const built = buildCountLines(product, lines)
    if (built.error) {
      const err = new Error(built.error)
      err.statusCode = 400
      throw err
    }

    const adjust = Boolean(applyAdjustment)
    if (adjust) {
      const hasColors = Array.isArray(product.colors) && product.colors.length > 0
      for (const line of built.lines) {
        if (line.diff === 0) continue
        const update = hasColors
          ? { $set: { 'colors.$[c].countInStock': line.countedQty }, $inc: { countInStock: line.diff } }
          : { $set: { countInStock: line.countedQty } }
        const options = hasColors ? { session, arrayFilters: [{ 'c.name': line.color }] } : { session }
        const result = await Product.updateOne({ _id: product._id }, update, options)
        if (result.matchedCount !== 1) throw new Error('Không cập nhật được tồn kho')
      }
    }

    const [record] = await StockCount.create(
      [{
        product: product._id,
        productName: product.name,
        lines: built.lines,
        totalDiff: built.totalDiff,
        adjusted: adjust,
        note: String(note || '').trim(),
        countedBy: req.user?._id,
      }],
      { session }
    )

    await session.commitTransaction()
    logger.info(`Kiểm kê: ${product.name}, lệch ${built.totalDiff}, ${adjust ? 'đã chỉnh kho' : 'chỉ ghi nhận'}`)
    res.status(201).json(record)
  } catch (e) {
    await session.abortTransaction()
    res.status(e.statusCode || 500)
    throw new Error(e.message || 'Không thể lưu phiếu kiểm kê')
  } finally {
    session.endSession()
  }
})

// @desc    Lịch sử kiểm kê (lọc, sắp xếp, phân trang)
// @route   GET /api/stockcounts
// @access  Private/Admin
const getStockCounts = asyncHandler(async (req, res) => {
  const filter = {}
  const keyword = String(req.query.keyword || '').trim()
  if (keyword) filter.productName = new RegExp(escapeRegex(keyword), 'i')
  const range = dateRange(req.query.startDate, req.query.endDate)
  if (range) filter.countedAt = range
  if (req.query.result === 'match') filter.totalDiff = 0
  if (req.query.result === 'diff') filter.totalDiff = { $ne: 0 }
  if (req.query.adjusted === 'yes') filter.adjusted = true
  if (req.query.adjusted === 'no') filter.adjusted = false

  const dir = sortDirection(req.query.order)
  const sort =
    SORTABLE_FIELDS.has(req.query.sortBy) && dir !== null
      ? { [req.query.sortBy]: dir, _id: 1 }
      : { countedAt: -1, _id: 1 }

  const { page, pageSize, skip } = pageParams(req.query.pageNumber)
  const [total, counts] = await Promise.all([
    StockCount.countDocuments(filter),
    StockCount.find(filter).populate('countedBy', 'name').sort(sort).skip(skip).limit(pageSize).lean(),
  ])
  res.json({ counts, page, pages: pagesOf(total, pageSize), total })
})

export { getCountProduct, createStockCount, getStockCounts }
