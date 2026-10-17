import { dateRange, numRange, pageParams, pagesOf, sortDirection, escapeRegex } from '../utils/listQuery.js'
import { buildVoucherFilter } from '../controllers/voucherController.js'
import { buildImportFilter } from '../controllers/importController.js'

describe('listQuery helpers', () => {
  test('dateRange dùng giờ Việt Nam và bao trọn ngày cuối', () => {
    const r = dateRange('2026-10-01', '2026-10-02')
    expect(r.$gte.toISOString()).toBe('2026-09-30T17:00:00.000Z')
    expect(r.$lte.toISOString()).toBe('2026-10-02T16:59:59.999Z')
  })

  test('dateRange bỏ qua giá trị sai định dạng', () => {
    expect(dateRange('abc', '')).toBeNull()
    expect(dateRange('2026-13-45', undefined)).toBeNull()
  })

  test('numRange chỉ lấy số hợp lệ', () => {
    expect(numRange('10', '')).toEqual({ $gte: 10 })
    expect(numRange('', 'x')).toBeNull()
    expect(numRange(0, 5)).toEqual({ $gte: 0, $lte: 5 })
  })

  test('pageParams và pagesOf', () => {
    expect(pageParams('3')).toEqual({ page: 3, pageSize: 10, skip: 20 })
    expect(pageParams('-2').page).toBe(1)
    expect(pagesOf(0, 10)).toBe(1)
    expect(pagesOf(21, 10)).toBe(3)
  })

  test('sortDirection và escapeRegex', () => {
    expect(sortDirection('asc')).toBe(1)
    expect(sortDirection('desc')).toBe(-1)
    expect(sortDirection('x')).toBeNull()
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c')
  })
})

describe('buildVoucherFilter', () => {
  const now = new Date('2026-10-04T00:00:00Z')

  test('không có tham số thì không lọc', () => {
    expect(buildVoucherFilter({}, now)).toEqual({})
  })

  test('trạng thái hết hạn và tạm dừng', () => {
    expect(buildVoucherFilter({ status: 'expired' }, now).$and[0]).toEqual({ isActive: true, expiresAt: { $lt: now } })
    expect(buildVoucherFilter({ status: 'paused' }, now).$and[0]).toEqual({ isActive: false })
  })

  test('loại không hợp lệ bị bỏ qua', () => {
    expect(buildVoucherFilter({ type: 'hack' }, now)).toEqual({})
    expect(buildVoucherFilter({ type: 'fixed' }, now).$and[0]).toEqual({ type: 'fixed' })
  })

  test('khoảng ngày thành điều kiện giao nhau', () => {
    const f = buildVoucherFilter({ startDate: '2026-10-01', endDate: '2026-10-31' }, now)
    expect(f.$and).toHaveLength(2)
  })
})

describe('buildImportFilter mở rộng', () => {
  test('lọc khoảng giá nhập và số lượng', () => {
    const f = buildImportFilter({ minCost: '1000', maxCost: '5000', minQty: '2' })
    expect(f.unitCost).toEqual({ $gte: 1000, $lte: 5000 })
    expect(f.quantity).toEqual({ $gte: 2 })
  })

  test('màu và nhà cung cấp là regex không phân biệt hoa thường', () => {
    const f = buildImportFilter({ color: 'đen', supplier: 'abc' })
    expect(f.color.test('Đen')).toBe(true)
    expect(f.supplier.test('ABC Corp')).toBe(true)
  })
})
