import { oldestStockDate, ageInDays, effectiveThreshold, buildAgingRow } from '../utils/stockAging.js'

const d = (s) => new Date(`${s}T00:00:00Z`)

describe('oldestStockDate (nhập trước bán trước)', () => {
  it('tồn nằm gọn trong lô mới nhất', () => {
    const imports = [{ date: d('2026-06-01'), qty: 10 }, { date: d('2026-09-01'), qty: 5 }]
    expect(oldestStockDate({ stock: 3, imports }).date).toEqual(d('2026-09-01'))
  })
  it('tồn vượt lô mới thì lấy tới lô cũ hơn', () => {
    const imports = [{ date: d('2026-06-01'), qty: 10 }, { date: d('2026-09-01'), qty: 5 }]
    expect(oldestStockDate({ stock: 8, imports }).date).toEqual(d('2026-06-01'))
  })
  it('tồn nhiều hơn tổng nhập thì tính từ ngày dự phòng', () => {
    const imports = [{ date: d('2026-09-01'), qty: 5 }]
    const r = oldestStockDate({ stock: 9, imports, fallbackDate: d('2026-01-01') })
    expect(r.date).toEqual(d('2026-01-01'))
    expect(r.basedOn).toBe('created')
  })
  it('hết hàng không có tuổi tồn', () => {
    expect(oldestStockDate({ stock: 0, imports: [] }).date).toBeNull()
  })
})

describe('ngưỡng và dòng cảnh báo', () => {
  it('ngưỡng riêng ghi đè ngưỡng chung', () => {
    expect(effectiveThreshold(30, 60)).toBe(30)
    expect(effectiveThreshold(0, 60)).toBe(60)
  })
  it('đánh dấu vượt ngưỡng', () => {
    const now = d('2026-10-05')
    const row = buildAgingRow({
      product: { _id: 'p1', name: 'A', countInStock: 4, createdAt: d('2026-01-01'), agingThresholdDays: 0 },
      imports: [{ date: d('2026-07-01'), qty: 10 }],
      lastSaleAt: d('2026-09-25'),
      globalThreshold: 60,
      now,
    })
    expect(row.ageDays).toBe(96)
    expect(row.over).toBe(true)
    expect(row.overBy).toBe(36)
    expect(row.daysSinceSale).toBe(10)
    expect(ageInDays(d('2026-10-06'), now)).toBe(0)
  })
})

describe('mã lô trong tuổi tồn', () => {
  it('trả về mã lô của lô cũ nhất còn hàng', () => {
    const imports = [
      { date: d('2026-06-01'), qty: 10, lotCode: 'LO-260601-0001' },
      { date: d('2026-09-01'), qty: 5, lotCode: 'LO-260901-0001' },
    ]
    expect(oldestStockDate({ stock: 8, imports }).lotCode).toBe('LO-260601-0001')
    expect(oldestStockDate({ stock: 3, imports }).lotCode).toBe('LO-260901-0001')
  })
})
