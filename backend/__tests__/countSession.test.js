import { formatUnitCode, parseUnitCode, colorCodeOf, colorCodesFor, colorCodeFor } from '../utils/unitCode.js'
import { buildSessionRows, countKey } from '../utils/countSession.js'

describe('mã tem đơn vị', () => {
  const day = new Date('2026-10-05T03:00:00Z')
  it('ghép mã sản phẩm, màu, số thứ tự và ngày nhập', () => {
    expect(formatUnitCode('HS-OPX9', 'WHITE', 7, day)).toBe('HS-OPX9-WHITE-00007-261005')
    expect(formatUnitCode('HS-IP15-2', 'BLUE', 12, day)).toBe('HS-IP15-2-BLUE-00012-261005')
  })
  it('đọc được mã trần, mã chữ thường và đường dẫn chứa mã', () => {
    expect(parseUnitCode('HS-OPX9-WHITE-00007-261005')).toBe('HS-OPX9-WHITE-00007-261005')
    expect(parseUnitCode(' hs-ip15-2-blue-00012-261005\n')).toBe('HS-IP15-2-BLUE-00012-261005')
    expect(parseUnitCode('https://shop.vn/scan?u=HS-OPX9-NC-00001-261005')).toBe('HS-OPX9-NC-00001-261005')
  })
  it('từ chối mã không đúng dạng', () => {
    expect(parseUnitCode('HS-OPX9')).toBeNull()
    expect(parseUnitCode('HS-OPX9-0001-00007')).toBeNull()
    expect(parseUnitCode('')).toBeNull()
    expect(parseUnitCode(null)).toBeNull()
  })
})

describe('mã màu', () => {
  it('đổi tên màu tiếng Việt sang tiếng Anh viết liền', () => {
    expect(colorCodeOf('Trắng')).toBe('WHITE')
    expect(colorCodeOf('Đen')).toBe('BLACK')
    expect(colorCodeOf('Xanh dương')).toBe('BLUE')
    expect(colorCodeOf('Xanh lá')).toBe('GREEN')
    expect(colorCodeOf('Titan tự nhiên')).toBe('TITANNATURAL')
    expect(colorCodeOf('')).toBe('NC')
  })
  it('giữ nguyên tên màu đã là tiếng Anh', () => {
    expect(colorCodeOf('Space Gray')).toBe('SPACEGRAY')
    expect(colorCodeOf('White')).toBe('WHITE')
  })
  it('hai màu trùng mã trong cùng sản phẩm được thêm số', () => {
    const map = colorCodesFor(['Xanh', 'Xanh dương', 'Đỏ'])
    expect(map.get('Xanh')).toBe('BLUE')
    expect(map.get('Xanh dương')).toBe('BLUE2')
    expect(map.get('Đỏ')).toBe('RED')
  })
  it('sản phẩm không có màu dùng mã NC', () => {
    expect(colorCodeFor({ colors: [] }, '')).toBe('NC')
    expect(colorCodeFor({ colors: [{ name: 'Đen' }] }, 'Đen')).toBe('BLACK')
  })
})

describe('buildSessionRows', () => {
  const phone = {
    _id: 'p1', name: 'iPhone 15', productCode: 'HS-IP15-0001',
    colors: [{ name: 'Đen', countInStock: 5 }, { name: 'Trắng', countInStock: 2 }],
  }
  const plain = { _id: 'p2', name: 'Ốp lưng', productCode: 'HS-OP-0001', countInStock: 10 }

  it('đếm theo màu và tính chênh lệch với tồn hệ thống', () => {
    const counts = new Map([[countKey('p1', 'Đen'), 4], [countKey('p1', 'Trắng'), 2]])
    const rows = buildSessionRows([phone, plain], counts)
    expect(rows).toHaveLength(1)
    expect(rows[0].lines).toEqual([
      { color: 'Đen', systemQty: 5, countedQty: 4, diff: -1 },
      { color: 'Trắng', systemQty: 2, countedQty: 2, diff: 0 },
    ])
    expect(rows[0].totalDiff).toBe(-1)
  })
  it('màu chưa quét tem nào tính là 0', () => {
    const rows = buildSessionRows([phone], new Map([[countKey('p1', 'Đen'), 5]]))
    expect(rows[0].lines[1]).toEqual({ color: 'Trắng', systemQty: 2, countedQty: 0, diff: -2 })
  })
  it('bỏ qua sản phẩm chưa quét trừ khi bật includeUnscanned', () => {
    const counts = new Map([[countKey('p1', 'Đen'), 5]])
    expect(buildSessionRows([phone, plain], counts)).toHaveLength(1)
    const all = buildSessionRows([phone, plain], counts, { includeUnscanned: true })
    expect(all).toHaveLength(2)
    expect(all[1].lines[0]).toEqual({ color: '', systemQty: 10, countedQty: 0, diff: -10 })
  })
})
