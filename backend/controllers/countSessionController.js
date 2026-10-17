import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Product from '../models/productModel.js'
import StockCount from '../models/stockCountModel.js'
import StockUnit from '../models/stockUnitModel.js'
import { CountSession, CountScan } from '../models/countSessionModel.js'
import logger from '../utils/logger.js'
import { buildCountLines } from '../utils/stockCount.js'
import { parseUnitCode } from '../utils/unitCode.js'
import { buildSessionRows, countKey } from '../utils/countSession.js'
import { pageParams, pagesOf } from '../utils/listQuery.js'

const PRODUCT_FIELDS = 'name productCode countInStock colors.name colors.countInStock'

const loadSession = async (id, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error('Mã phiên không hợp lệ')
  }
  const session = await CountSession.findById(id)
  if (!session) {
    res.status(404)
    throw new Error('Không tìm thấy phiên kiểm kê')
  }
  return session
}

const countsOf = async (sessionId, dbSession) => {
  const q = CountScan.aggregate([
    { $match: { session: new mongoose.Types.ObjectId(sessionId) } },
    { $group: { _id: { product: '$product', color: '$color' }, n: { $sum: 1 } } },
  ])
  if (dbSession) q.session(dbSession)
  const grouped = await q
  const counts = new Map()
  grouped.forEach((g) => counts.set(countKey(g._id.product, g._id.color), g.n))
  return counts
}

const pad = (n) => String(n).padStart(2, '0')
const defaultName = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return `Kiểm kê ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

// @desc    Mở phiên quét kiểm kê
// @route   POST /api/count-sessions
const createSession = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim() || defaultName()
  const session = await CountSession.create({ name, createdBy: req.user._id })
  res.status(201).json(session)
})

// @desc    Danh sách phiên
// @route   GET /api/count-sessions?pageNumber=
const getSessions = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status === 'open' || req.query.status === 'closed') filter.status = req.query.status
  const { page, pageSize, skip } = pageParams(req.query.pageNumber)
  const [total, sessions] = await Promise.all([
    CountSession.countDocuments(filter),
    CountSession.find(filter).select('-result').sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
  ])
  const withCounts = await Promise.all(sessions.map(async (s) => ({
    ...s, scanCount: await CountScan.countDocuments({ session: s._id }),
  })))
  res.json({ sessions: withCounts, page, pages: pagesOf(total, pageSize), total })
})

// @desc    Chi tiết phiên: tiến độ theo sản phẩm/màu và các lần quét gần nhất
// @route   GET /api/count-sessions/:id?includeUnscanned=1
const getSession = asyncHandler(async (req, res) => {
  const session = await loadSession(req.params.id, res)
  const scanCount = await CountScan.countDocuments({ session: session._id })
  const base = { _id: session._id, name: session.name, status: session.status, createdAt: session.createdAt, closedAt: session.closedAt, scanCount }

  if (session.status === 'closed') {
    return res.json({ ...base, result: session.result || null, rows: session.result?.products || [], recent: [] })
  }

  const counts = await countsOf(session._id)
  const includeUnscanned = req.query.includeUnscanned === '1'
  const ids = [...new Set([...counts.keys()].map((k) => k.split('|')[0]))]
  const products = await Product.find(includeUnscanned ? {} : { _id: { $in: ids } }).select(PRODUCT_FIELDS).lean()
  const rows = buildSessionRows(products, counts, { includeUnscanned })
  const recent = await CountScan.find({ session: session._id }).sort({ scannedAt: -1 }).limit(15).lean()
  res.json({
    ...base,
    rows,
    recent: recent.map((r) => ({ code: r.code, productName: r.productName, color: r.color, scannedAt: r.scannedAt })),
  })
})

// @desc    Quét một tem: cộng 1 cho sản phẩm/màu của tem
// @route   POST /api/count-sessions/:id/scan  { code }
const scanUnit = asyncHandler(async (req, res) => {
  const session = await loadSession(req.params.id, res)
  if (session.status !== 'open') {
    res.status(409)
    throw new Error('Phiên đã chốt, không quét thêm được')
  }
  const code = parseUnitCode(req.body.code)
  if (!code) {
    res.status(400)
    throw new Error('Mã không đúng định dạng tem đơn vị')
  }
  const unit = await StockUnit.findOne({ code }).lean()
  if (!unit) {
    res.status(404)
    throw new Error('Không tìm thấy tem này trong hệ thống')
  }
  const product = await Product.findById(unit.product).select(PRODUCT_FIELDS).lean()
  if (!product) {
    res.status(404)
    throw new Error('Sản phẩm của tem này không còn tồn tại')
  }

  try {
    await CountScan.create({
      session: session._id, code, product: product._id, productName: product.name,
      color: unit.color, scannedBy: req.user._id,
    })
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: 'Tem này đã được quét trong phiên', duplicate: true, code, productName: product.name, color: unit.color })
    }
    throw e
  }

  const counted = await CountScan.countDocuments({ session: session._id, product: product._id, color: unit.color })
  const hasColors = Array.isArray(product.colors) && product.colors.length > 0
  const systemQty = hasColors
    ? Number(product.colors.find((c) => c.name === unit.color)?.countInStock) || 0
    : Number(product.countInStock) || 0
  res.status(201).json({
    code, productId: product._id, productName: product.name, productCode: product.productCode || '',
    color: unit.color, counted, systemQty,
  })
})

// @desc    Bỏ một lần quét (quét nhầm)
// @route   DELETE /api/count-sessions/:id/scan/:code
const undoScan = asyncHandler(async (req, res) => {
  const session = await loadSession(req.params.id, res)
  if (session.status !== 'open') {
    res.status(409)
    throw new Error('Phiên đã chốt')
  }
  const code = parseUnitCode(req.params.code)
  const result = code ? await CountScan.deleteOne({ session: session._id, code }) : { deletedCount: 0 }
  if (result.deletedCount !== 1) {
    res.status(404)
    throw new Error('Tem này chưa được quét trong phiên')
  }
  res.json({ ok: true })
})

// @desc    Chốt phiên: tạo phiếu kiểm kê cho từng sản phẩm, tuỳ chọn chỉnh tồn kho
// @route   POST /api/count-sessions/:id/close  { applyAdjustment, includeUnscanned, note }
const closeSession = asyncHandler(async (req, res) => {
  await loadSession(req.params.id, res)
  const adjust = Boolean(req.body.applyAdjustment)
  const includeUnscanned = Boolean(req.body.includeUnscanned)
  const note = String(req.body.note || '').trim()

  const db = await mongoose.startSession()
  db.startTransaction()
  try {
    const session = await CountSession.findOneAndUpdate(
      { _id: req.params.id, status: 'open' },
      { $set: { status: 'closed', closedAt: new Date(), note } },
      { session: db, new: true }
    )
    if (!session) {
      const err = new Error('Phiên đã được chốt trước đó')
      err.statusCode = 409
      throw err
    }

    const counts = await countsOf(session._id, db)
    if (counts.size === 0 && !includeUnscanned) {
      const err = new Error('Phiên chưa có tem nào được quét')
      err.statusCode = 400
      throw err
    }
    const ids = [...new Set([...counts.keys()].map((k) => k.split('|')[0]))]
    const products = await Product.find(includeUnscanned ? {} : { _id: { $in: ids } }).select(PRODUCT_FIELDS).session(db).lean()
    const rows = buildSessionRows(products, counts, { includeUnscanned })
    const byId = new Map(products.map((p) => [String(p._id), p]))

    for (const row of rows) {
      const product = byId.get(row.productId)
      const built = buildCountLines(product, row.lines.map((l) => ({ color: l.color, countedQty: l.countedQty })))
      if (built.error) {
        const err = new Error(`${row.name}: ${built.error}`)
        err.statusCode = 400
        throw err
      }
      if (adjust) {
        const hasColors = Array.isArray(product.colors) && product.colors.length > 0
        for (const line of built.lines) {
          if (line.diff === 0) continue
          const update = hasColors
            ? { $set: { 'colors.$[c].countInStock': line.countedQty }, $inc: { countInStock: line.diff } }
            : { $set: { countInStock: line.countedQty } }
          const options = hasColors ? { session: db, arrayFilters: [{ 'c.name': line.color }] } : { session: db }
          const result = await Product.updateOne({ _id: product._id }, update, options)
          if (result.matchedCount !== 1) throw new Error('Không cập nhật được tồn kho')
        }
      }
      await StockCount.create(
        [{
          product: product._id, productName: product.name, lines: built.lines, totalDiff: built.totalDiff,
          adjusted: adjust, note: `Phiên: ${session.name}${note ? `. ${note}` : ''}`, countedBy: req.user._id,
        }],
        { session: db }
      )
    }

    const result = {
      adjusted: adjust,
      includeUnscanned,
      totalDiff: rows.reduce((s, r) => s + r.totalDiff, 0),
      products: rows,
    }
    await CountSession.updateOne({ _id: session._id }, { $set: { result } }, { session: db })
    await db.commitTransaction()
    logger.info(`Chốt phiên kiểm kê "${session.name}": ${rows.length} sản phẩm, ${adjust ? 'đã chỉnh kho' : 'chỉ ghi nhận'}`)
    res.json({ ok: true, result })
  } catch (e) {
    await db.abortTransaction()
    res.status(e.statusCode || 500)
    throw new Error(e.message || 'Không thể chốt phiên')
  } finally {
    db.endSession()
  }
})

export { createSession, getSessions, getSession, scanUnit, undoScan, closeSession }
