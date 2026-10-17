import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Product from '../models/productModel.js'
import Order from '../models/orderModel.js'
import { getInventorySettings } from '../models/inventorySettingModel.js'
import { callAI } from '../utils/aiProvider.js'
import { loadPriceSeries } from '../utils/marketData.js'
import { bucketWeekly, forecastDemand, reorderAdvice, priceTrend } from '../utils/forecast.js'
import logger from '../utils/logger.js'

const clampInt = (value, min, max, fallback) => {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

const readParams = async (query) => {
  const settings = await getInventorySettings()
  return {
    leadDays: clampInt(query.leadDays, 1, 90, settings.leadTimeDays),
    coverDays: clampInt(query.coverDays, 1, 180, settings.coverDays),
    weeks: clampInt(query.weeks, 4, 26, 12),
  }
}

const loadSalesEvents = async (weeks, now) => {
  const start = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000)
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start }, isCancelled: { $ne: true }, status: { $nin: ['cancelled', 'returned'] } } },
    { $unwind: '$orderItems' },
    { $project: { _id: 0, product: '$orderItems.product', date: '$createdAt', qty: '$orderItems.qty' } },
  ])
  const map = new Map()
  for (const r of rows) {
    const key = String(r.product)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({ date: r.date, qty: r.qty })
  }
  return map
}

const buildRow = (product, events, prices, params, now) => {
  const id = String(product._id)
  const series = bucketWeekly(events.get(id) || [], now, params.weeks)
  const demand = forecastDemand(series, 4)
  const advice = reorderAdvice({
    stock: product.countInStock || 0,
    weeklyForecast: demand.nextWeek,
    series,
    leadDays: params.leadDays,
    coverDays: params.coverDays,
  })
  return {
    productId: id,
    name: product.name,
    brand: product.brand,
    stock: product.countInStock || 0,
    soldInPeriod: series.reduce((s, x) => s + x, 0),
    weeklyForecast: demand.nextWeek,
    method: demand.method,
    methodLabel: demand.methodLabel,
    mae: demand.mae,
    confidence: demand.confidence,
    ...advice,
    costTrend: priceTrend(prices.cost.get(id)),
    marketTrend: priceTrend(prices.market.get(id)),
    _series: series,
    _demand: demand,
  }
}

const URGENCY = { out: 0, reorder: 1, ok: 2, overstock: 3, no_demand: 4 }

// @desc    Dự báo nhu cầu và gợi ý nhập hàng cho toàn bộ sản phẩm
// @route   GET /api/forecast/overview?leadDays=&coverDays=&weeks=
// @access  Private/Admin
const getForecastOverview = asyncHandler(async (req, res) => {
  const params = await readParams(req.query)
  const now = new Date()
  const products = await Product.find({}).select('name brand countInStock').lean()
  const [events, prices] = await Promise.all([loadSalesEvents(params.weeks, now), loadPriceSeries(products)])

  const rows = products
    .map((p) => buildRow(p, events, prices, params, now))
    .sort((a, b) => URGENCY[a.status] - URGENCY[b.status] || b.suggestedQty - a.suggestedQty)
    .map(({ _series, _demand, ...rest }) => rest)

  res.json({ params, generatedAt: now, rows })
})

// @desc    Chi tiết dự báo một sản phẩm: chuỗi bán theo tuần, so sánh phương pháp, giá nhập và giá thị trường
// @route   GET /api/forecast/product/:id
// @access  Private/Admin
const getProductForecast = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400)
    throw new Error('Mã sản phẩm không hợp lệ')
  }
  const product = await Product.findById(req.params.id).select('name brand countInStock').lean()
  if (!product) {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }
  const params = await readParams(req.query)
  const now = new Date()
  const [events, prices] = await Promise.all([loadSalesEvents(params.weeks, now), loadPriceSeries([product])])
  const row = buildRow(product, events, prices, params, now)

  const history = row._series.map((qty, i) => ({
    weekStart: new Date(now.getTime() - (params.weeks - i) * 7 * 24 * 60 * 60 * 1000),
    qty,
  }))
  const id = String(product._id)
  const { _series, _demand, ...summary } = row
  res.json({
    ...summary,
    params,
    history,
    forecast: _demand.weekly,
    candidates: _demand.candidates,
    costPoints: prices.cost.get(id) || [],
    marketPoints: prices.market.get(id) || [],
  })
})

const STATUS_TEXT = {
  out: 'đã hết hàng',
  reorder: 'xuống dưới điểm đặt hàng',
  overstock: 'tồn nhiều so với nhu cầu',
  ok: 'ổn',
  no_demand: 'chưa có nhu cầu',
}
const TREND_TEXT = { up: 'đang tăng', down: 'đang giảm', flat: 'ổn định', unknown: 'chưa đủ dữ liệu' }

// Nhận xét dựng thẳng từ số liệu, dùng khi AI không phản hồi
const rulesAdvice = (rows) => {
  const urgent = rows.filter((r) => r.status === 'out' || r.status === 'reorder').slice(0, 5)
  const over = rows.filter((r) => r.status === 'overstock').slice(0, 3)
  const lines = []
  if (urgent.length === 0) lines.push('Hiện chưa có sản phẩm nào chạm điểm đặt hàng.')
  for (const r of urgent) {
    lines.push(`${r.name}: ${STATUS_TEXT[r.status]}, tồn ${r.stock}, bán khoảng ${r.weeklyForecast} máy/tuần, nên nhập khoảng ${r.suggestedQty}. Giá nhập ${TREND_TEXT[r.costTrend.direction]}.`)
  }
  for (const r of over) {
    lines.push(`${r.name}: ${STATUS_TEXT[r.status]} (đủ bán ${r.daysOfCover} ngày), chưa cần nhập thêm.`)
  }
  return lines.join('\n')
}

// @desc    Nhận xét về kế hoạch nhập hàng, AI diễn giải từ số liệu đã tính
// @route   POST /api/forecast/advice
// @access  Private/Admin
const getForecastAdvice = asyncHandler(async (req, res) => {
  const params = await readParams(req.body || {})
  const now = new Date()
  const products = await Product.find({}).select('name brand countInStock').lean()
  const [events, prices] = await Promise.all([loadSalesEvents(params.weeks, now), loadPriceSeries(products)])
  const rows = products
    .map((p) => buildRow(p, events, prices, params, now))
    .sort((a, b) => URGENCY[a.status] - URGENCY[b.status] || b.suggestedQty - a.suggestedQty)

  const focus = rows.filter((r) => r.status !== 'no_demand').slice(0, 8).map((r) => ({
    san_pham: r.name,
    ton: r.stock,
    du_bao_moi_tuan: r.weeklyForecast,
    du_ban_ngay: r.daysOfCover,
    diem_dat_hang: r.reorderPoint,
    goi_y_nhap: r.suggestedQty,
    trang_thai: STATUS_TEXT[r.status],
    do_tin_cay: r.confidence,
    xu_huong_gia_nhap: TREND_TEXT[r.costTrend.direction],
    thay_doi_gia_nhap_moi_thang_pct: r.costTrend.changePerMonthPct,
  }))

  if (focus.length === 0) {
    return res.json({ source: 'rules', text: 'Chưa có dữ liệu bán hàng để đưa ra nhận xét.' })
  }

  const systemPrompt = [
    'Bạn là trợ lý quản lý kho của một cửa hàng điện thoại. Viết nhận xét ngắn bằng tiếng Việt cho chủ shop dựa trên số liệu được cung cấp.',
    'Quy tắc: chỉ dùng số liệu có trong dữ liệu, không bịa giá thị trường hay sự kiện bên ngoài. Nêu trước các sản phẩm cần nhập gấp và số lượng nên nhập, sau đó cảnh báo sản phẩm tồn nhiều và xu hướng giá nhập.',
    'Văn phong tự nhiên, câu ngắn, tối đa 8 câu. Không mở đầu bằng lời chào hay câu sáo rỗng, không dùng gạch ngang dài, không in đậm, không dùng gạch đầu dòng. Nếu độ tin cậy thấp thì nói rõ dữ liệu còn ít.',
  ].join('\n')

  try {
    const text = await callAI(
      systemPrompt,
      [{ role: 'user', content: `Thời gian chờ hàng ${params.leadDays} ngày, muốn đủ hàng thêm ${params.coverDays} ngày. Số liệu:\n${JSON.stringify(focus)}` }],
      { maxTokens: 700 }
    )
    res.json({ source: 'ai', text: text.trim() })
  } catch (e) {
    logger.warn(`[Forecast] AI không phản hồi, dùng nhận xét theo quy tắc: ${e.message}`)
    res.json({ source: 'rules', text: rulesAdvice(rows) })
  }
})

export { getForecastOverview, getProductForecast, getForecastAdvice }
