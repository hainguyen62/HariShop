import { bucketWeekly, forecastDemand, reorderAdvice, priceTrend, backtestMae, mean } from '../utils/forecast.js'

const DAY = 24 * 60 * 60 * 1000

describe('bucketWeekly', () => {
  it('gom theo tuần, tuần cũ nhất đứng đầu', () => {
    const now = new Date('2026-10-05T00:00:00Z')
    const events = [
      { date: new Date(now - 1 * DAY), qty: 2 },
      { date: new Date(now - 8 * DAY), qty: 3 },
      { date: new Date(now - 20 * DAY), qty: 1 },
      { date: new Date(now - 100 * DAY), qty: 9 },
    ]
    expect(bucketWeekly(events, now, 4)).toEqual([0, 1, 3, 2])
  })
})

describe('forecastDemand', () => {
  it('chuỗi không có bán trả về 0', () => {
    const r = forecastDemand([0, 0, 0, 0, 0])
    expect(r.nextWeek).toBe(0)
    expect(r.method).toBe('none')
  })
  it('chuỗi ổn định cho dự báo gần mức trung bình', () => {
    const r = forecastDemand([5, 5, 5, 5, 5, 5, 5, 5])
    expect(r.nextWeek).toBeCloseTo(5, 0)
    expect(r.confidence).toBe('cao')
  })
  it('chuỗi tăng đều được Holt bắt xu hướng', () => {
    const series = [2, 4, 6, 8, 10, 12, 14, 16]
    const r = forecastDemand(series)
    expect(r.method).toBe('holt')
    expect(r.nextWeek).toBeGreaterThan(16)
  })
  it('dữ liệu quá ngắn vẫn trả kết quả', () => {
    const r = forecastDemand([3, 5])
    expect(r.nextWeek).toBe(4)
    expect(r.confidence).toBe('thấp')
  })
  it('backtest cần đủ điểm', () => {
    expect(backtestMae([1, 2, 3], (h) => mean(h))).toBeNull()
  })
})

describe('reorderAdvice', () => {
  it('tính điểm đặt hàng và số lượng gợi ý', () => {
    const r = reorderAdvice({ stock: 5, weeklyForecast: 14, series: [14, 14, 14, 14], leadDays: 7, coverDays: 30 })
    expect(r.dailyDemand).toBe(2)
    expect(r.reorderPoint).toBe(14)
    expect(r.suggestedQty).toBe(2 * 37 - 5)
    expect(r.status).toBe('reorder')
  })
  it('hết hàng và tồn thừa', () => {
    expect(reorderAdvice({ stock: 0, weeklyForecast: 7, series: [7, 7, 7], leadDays: 7, coverDays: 30 }).status).toBe('out')
    expect(reorderAdvice({ stock: 500, weeklyForecast: 7, series: [7, 7, 7], leadDays: 7, coverDays: 30 }).status).toBe('overstock')
    expect(reorderAdvice({ stock: 5, weeklyForecast: 0, series: [0, 0], leadDays: 7, coverDays: 30 }).status).toBe('no_demand')
  })
})

describe('priceTrend', () => {
  it('nhận ra giá tăng', () => {
    const pts = [0, 30, 60, 90].map((d, i) => ({ date: new Date(Date.UTC(2026, 0, 1) + d * DAY), price: 10000000 + i * 500000 }))
    const r = priceTrend(pts)
    expect(r.direction).toBe('up')
    expect(r.nextMonthEstimate).toBeGreaterThan(11500000)
  })
  it('giá phẳng và thiếu dữ liệu', () => {
    const flat = [0, 30, 60].map((d) => ({ date: new Date(Date.UTC(2026, 0, 1) + d * DAY), price: 9000000 }))
    expect(priceTrend(flat).direction).toBe('flat')
    expect(priceTrend([{ date: new Date(), price: 1 }]).direction).toBe('unknown')
  })
})

describe('parseMarketCsv', () => {
  it('đọc giá thị trường theo tên hoặc id, bỏ dòng sai', async () => {
    const { parseMarketCsv } = await import('../utils/marketData.js')
    const products = [{ _id: 'a1', name: 'iPhone 15 Pro' }, { _id: 'b2', name: 'Samsung S24' }]
    const csv = [
      'product,date,price',
      'iphone 15 pro,2026-09-01,25000000',
      'b2,2026-09-10,20000000',
      'Không có,2026-09-10,1',
      'iPhone 15 Pro,hỏng,1',
      'iPhone 15 Pro,2026-08-01,24000000',
    ].join('\n')
    const map = parseMarketCsv(csv, products)
    expect(map.get('a1').map((p) => p.price)).toEqual([24000000, 25000000])
    expect(map.get('b2')).toHaveLength(1)
    expect(map.size).toBe(2)
  })
})

describe('generateDemoPlan', () => {
  it('lặp lại được với cùng seed và tạo đủ dữ liệu', async () => {
    const { generateDemoPlan } = await import('../utils/demoData.js')
    const products = [{ price: 20000000 }, { price: 10000000 }]
    const now = new Date('2026-10-05T00:00:00Z')
    const a = generateDemoPlan(products, { now, seed: 3 })
    const b = generateDemoPlan(products, { now, seed: 3 })
    expect(a).toEqual(b)
    expect(a.orders.length).toBeGreaterThan(10)
    expect(a.imports.length).toBe(8)
    expect(a.imports.every((i) => i.cost > 0)).toBe(true)
    expect(a.orders.every((o) => o.date <= now)).toBe(true)
  })
})
