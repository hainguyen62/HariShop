// Dự báo nhu cầu và gợi ý nhập hàng bằng phương pháp thống kê cổ điển.
// Mỗi phương pháp được chấm bằng backtest (dự đoán 1 bước rồi so với thực tế), chọn phương pháp có sai số nhỏ nhất.

export const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0)

export const stddev = (arr) => {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1))
}

const DAY = 24 * 60 * 60 * 1000

// Gom sự kiện bán hàng thành chuỗi theo tuần, tuần cũ nhất đứng đầu, tuần cuối kết thúc tại `now`
export const bucketWeekly = (events, now, weeks) => {
  const series = new Array(weeks).fill(0)
  const end = now.getTime()
  for (const ev of events) {
    const t = new Date(ev.date).getTime()
    const ago = end - t
    if (ago < 0 || ago >= weeks * 7 * DAY) continue
    const idx = weeks - 1 - Math.floor(ago / (7 * DAY))
    series[idx] += Number(ev.qty) || 0
  }
  return series
}

const movingAverage = (k) => (history) => mean(history.slice(-k))

const expSmoothing = (alpha) => (history) => {
  let level = history[0]
  for (let i = 1; i < history.length; i += 1) level = alpha * history[i] + (1 - alpha) * level
  return level
}

// Holt: làm mịn mũ có xu hướng, trả về hàm dự đoán h bước phía trước
const holtState = (alpha, beta, history) => {
  let level = history[0]
  let trend = history.length > 1 ? history[1] - history[0] : 0
  for (let i = 1; i < history.length; i += 1) {
    const prev = level
    level = alpha * history[i] + (1 - alpha) * (level + trend)
    trend = beta * (level - prev) + (1 - beta) * trend
  }
  return { level, trend }
}

const holt = (alpha, beta) => (history, h = 1) => {
  const { level, trend } = holtState(alpha, beta, history)
  return level + h * trend
}

export const METHODS = [
  { id: 'ma3', label: 'Trung bình trượt 3 tuần', fn: movingAverage(3) },
  { id: 'ma4', label: 'Trung bình trượt 4 tuần', fn: movingAverage(4) },
  { id: 'ses02', label: 'Làm mịn mũ (α=0,2)', fn: expSmoothing(0.2) },
  { id: 'ses04', label: 'Làm mịn mũ (α=0,4)', fn: expSmoothing(0.4) },
  { id: 'ses06', label: 'Làm mịn mũ (α=0,6)', fn: expSmoothing(0.6) },
  { id: 'holt', label: 'Holt có xu hướng (α=0,4, β=0,2)', fn: holt(0.4, 0.2) },
]

const MIN_TRAIN = 3

export const backtestMae = (series, fn) => {
  if (series.length <= MIN_TRAIN) return null
  let total = 0
  let n = 0
  for (let t = MIN_TRAIN; t < series.length; t += 1) {
    const pred = Math.max(0, fn(series.slice(0, t)))
    total += Math.abs(pred - series[t])
    n += 1
  }
  return n ? total / n : null
}

export const forecastDemand = (series, horizon = 4) => {
  const n = series.length
  const total = series.reduce((s, x) => s + x, 0)
  if (n === 0 || total === 0) {
    return { method: 'none', methodLabel: 'Chưa có dữ liệu bán', mae: null, weekly: new Array(horizon).fill(0), nextWeek: 0, confidence: 'thấp', candidates: [] }
  }

  const candidates = METHODS.map((m) => ({ id: m.id, label: m.label, mae: backtestMae(series, m.fn) }))
  const scored = candidates.filter((c) => c.mae !== null)
  let best
  if (scored.length === 0) {
    best = { id: 'mean', label: 'Trung bình toàn kỳ (dữ liệu quá ít để so sánh)', mae: null }
  } else {
    best = scored.reduce((a, b) => (b.mae < a.mae ? b : a))
  }

  const weekly = []
  for (let h = 1; h <= horizon; h += 1) {
    let value
    if (best.id === 'mean') value = mean(series)
    else if (best.id === 'holt') value = METHODS.find((m) => m.id === 'holt').fn(series, h)
    else value = METHODS.find((m) => m.id === best.id).fn(series)
    weekly.push(Math.max(0, Math.round(value * 10) / 10))
  }

  const avg = mean(series)
  let confidence = 'thấp'
  if (scored.length > 0 && n >= 8 && avg > 0 && best.mae / avg < 0.4) confidence = 'cao'
  else if (n >= 5 && total >= 5) confidence = 'trung bình'

  return {
    method: best.id,
    methodLabel: best.label,
    mae: best.mae === null ? null : Math.round(best.mae * 100) / 100,
    weekly,
    nextWeek: weekly[0],
    confidence,
    candidates: candidates.map((c) => ({ ...c, mae: c.mae === null ? null : Math.round(c.mae * 100) / 100 })),
  }
}

// Điểm đặt hàng và số lượng gợi ý: nhu cầu trong thời gian chờ hàng cộng tồn an toàn (mức phục vụ 95%)
export const reorderAdvice = ({ stock, weeklyForecast, series, leadDays, coverDays, z = 1.65 }) => {
  const daily = weeklyForecast / 7
  const sigmaDaily = stddev(series) / Math.sqrt(7)
  const safety = Math.ceil(z * sigmaDaily * Math.sqrt(leadDays))
  const reorderPoint = Math.ceil(daily * leadDays + safety)
  const target = Math.ceil(daily * (leadDays + coverDays) + safety)
  const suggestedQty = Math.max(0, target - stock)
  const daysOfCover = daily > 0 ? Math.round((stock / daily) * 10) / 10 : null

  let status = 'ok'
  if (daily === 0) status = 'no_demand'
  else if (stock <= 0) status = 'out'
  else if (stock <= reorderPoint) status = 'reorder'
  else if (daysOfCover !== null && daysOfCover > 90) status = 'overstock'

  return { dailyDemand: Math.round(daily * 100) / 100, safetyStock: safety, reorderPoint, target, suggestedQty, daysOfCover, status }
}

// Xu hướng giá theo hồi quy tuyến tính trên các mốc (ngày, giá)
export const priceTrend = (points, flatThreshold = 0.02) => {
  const clean = (points || [])
    .map((p) => ({ t: new Date(p.date).getTime(), price: Number(p.price) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.price))
    .sort((a, b) => a.t - b.t)

  if (clean.length < 3) {
    return { direction: 'unknown', points: clean.length, lastPrice: clean.length ? clean[clean.length - 1].price : null, changePerMonthPct: null, nextMonthEstimate: null, r2: null }
  }

  const t0 = clean[0].t
  const xs = clean.map((p) => (p.t - t0) / DAY)
  const ys = clean.map((p) => p.price)
  const mx = mean(xs)
  const my = mean(ys)
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = my - slope * mx
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0)
  const ssRes = ys.reduce((s, y, i) => s + (y - (intercept + slope * xs[i])) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  const lastX = xs[xs.length - 1]
  const lastFit = intercept + slope * lastX
  const changePerMonthPct = my > 0 ? (slope * 30) / my : 0
  const direction = Math.abs(changePerMonthPct) < flatThreshold ? 'flat' : changePerMonthPct > 0 ? 'up' : 'down'

  return {
    direction,
    points: clean.length,
    lastPrice: ys[ys.length - 1],
    changePerMonthPct: Math.round(changePerMonthPct * 1000) / 10,
    nextMonthEstimate: Math.max(0, Math.round(intercept + slope * (lastX + 30))),
    fittedLast: Math.round(lastFit),
    r2: Math.round(r2 * 100) / 100,
  }
}
