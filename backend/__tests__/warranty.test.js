import { computeWarrantyStatus } from '../utils/warranty.js'

describe('computeWarrantyStatus', () => {
  test('trả về "cancelled" nếu đơn đã bị hủy, bất kể đã giao hay chưa', () => {
    const order = { isCancelled: true, isDelivered: true, deliveredAt: new Date() }
    const item = { warrantyMonths: 12 }
    const result = computeWarrantyStatus(item, order)
    expect(result).toEqual({ status: 'cancelled', warrantyStart: null, warrantyEnd: null, remainingDays: null })
  })

  test('trả về "not_started" nếu đơn chưa được giao', () => {
    const order = { isCancelled: false, isDelivered: false, deliveredAt: null }
    const item = { warrantyMonths: 12 }
    const result = computeWarrantyStatus(item, order)
    expect(result).toEqual({ status: 'not_started', warrantyStart: null, warrantyEnd: null, remainingDays: null })
  })

  test('trả về "not_started" nếu isDelivered=true nhưng thiếu deliveredAt (dữ liệu cũ/thiếu)', () => {
    const order = { isCancelled: false, isDelivered: true, deliveredAt: null }
    const item = { warrantyMonths: 12 }
    const result = computeWarrantyStatus(item, order)
    expect(result.status).toBe('not_started')
  })

  test('còn bảo hành: giao hàng 1 tháng trước, bảo hành 12 tháng → còn hạn, còn khoảng 11 tháng', () => {
    const now = new Date('2026-02-01T00:00:00Z')
    const deliveredAt = new Date('2026-01-01T00:00:00Z')
    const order = { isCancelled: false, isDelivered: true, deliveredAt }
    const item = { warrantyMonths: 12 }

    const result = computeWarrantyStatus(item, order, now)
    expect(result.status).toBe('active')
    expect(result.warrantyEnd.toISOString()).toBe(new Date('2027-01-01T00:00:00Z').toISOString())
    expect(result.remainingDays).toBeGreaterThan(300)
  })

  test('hết bảo hành: giao hàng 13 tháng trước, bảo hành 12 tháng → hết hạn, remainingDays = 0', () => {
    const now = new Date('2026-02-01T00:00:00Z')
    const deliveredAt = new Date('2025-01-01T00:00:00Z')
    const order = { isCancelled: false, isDelivered: true, deliveredAt }
    const item = { warrantyMonths: 12 }

    const result = computeWarrantyStatus(item, order, now)
    expect(result.status).toBe('expired')
    expect(result.remainingDays).toBe(0)
  })

  test('vừa hết hạn đúng ngày (remainingDays=0 vẫn tính là expired, không phải active)', () => {
    const deliveredAt = new Date('2025-01-01T00:00:00Z')
    const now = new Date('2026-01-01T00:00:01Z') // trễ 1 giây sau đúng hạn 12 tháng
    const order = { isCancelled: false, isDelivered: true, deliveredAt }
    const item = { warrantyMonths: 12 }

    const result = computeWarrantyStatus(item, order, now)
    expect(result.status).toBe('expired')
  })

  test('sản phẩm có warrantyMonths riêng (24 tháng) khác mặc định', () => {
    const now = new Date('2026-02-01T00:00:00Z')
    const deliveredAt = new Date('2025-01-01T00:00:00Z') // 13 tháng trước
    const order = { isCancelled: false, isDelivered: true, deliveredAt }
    const item = { warrantyMonths: 24 }

    // 13 tháng trước, bảo hành 24 tháng → vẫn còn hạn (còn ~11 tháng)
    const result = computeWarrantyStatus(item, order, now)
    expect(result.status).toBe('active')
  })

  test('thiếu warrantyMonths trên item → mặc định dùng 12 tháng', () => {
    const now = new Date('2026-02-01T00:00:00Z')
    const deliveredAt = new Date('2026-01-01T00:00:00Z')
    const order = { isCancelled: false, isDelivered: true, deliveredAt }
    const item = {} // không có warrantyMonths

    const result = computeWarrantyStatus(item, order, now)
    expect(result.status).toBe('active')
    expect(result.warrantyEnd.toISOString()).toBe(new Date('2027-01-01T00:00:00Z').toISOString())
  })

  test('cộng tháng xử lý đúng qua năm mới (VD giao tháng 12, bảo hành 3 tháng → hết hạn tháng 3 năm sau)', () => {
    const now = new Date('2026-02-01T00:00:00Z')
    const deliveredAt = new Date('2025-12-15T00:00:00Z')
    const order = { isCancelled: false, isDelivered: true, deliveredAt }
    const item = { warrantyMonths: 3 }

    const result = computeWarrantyStatus(item, order, now)
    expect(result.warrantyEnd.getUTCFullYear()).toBe(2026)
    expect(result.warrantyEnd.getUTCMonth()).toBe(2) // tháng 3 (0-indexed = 2)
    expect(result.status).toBe('active')
  })
})