import { buildKeywordFilter } from '../utils/productSearch.js'

const matches = (filter, product) =>
  filter.$or.some((cond) => {
    const [field, rx] = Object.entries(cond)[0]
    return rx.test(product[field] || '')
  })

const phone = { name: 'iPhone 18 Pro Max', nameNormalized: 'iphone 18 pro max', productCode: 'HS-IP18' }
const viet = { name: 'Điện thoại Xiaomi Mix', nameNormalized: 'dien thoai xiaomi mix', productCode: 'HS-XM' }

describe('buildKeywordFilter', () => {
  it('từ khóa rỗng không tạo điều kiện lọc', () => {
    expect(buildKeywordFilter('')).toEqual({})
    expect(buildKeywordFilter('   ')).toEqual({})
    expect(buildKeywordFilter(undefined)).toEqual({})
  })

  it('khớp ở giữa tên, không phân biệt hoa thường như trước', () => {
    expect(matches(buildKeywordFilter('pro max'), phone)).toBe(true)
    expect(matches(buildKeywordFilter('IPHONE'), phone)).toBe(true)
    expect(matches(buildKeywordFilter('galaxy'), phone)).toBe(false)
  })

  it('khớp theo mã sản phẩm', () => {
    expect(matches(buildKeywordFilter('hs-ip18'), phone)).toBe(true)
  })

  it('gõ không dấu vẫn ra tên có dấu, gõ có dấu vẫn ra', () => {
    expect(matches(buildKeywordFilter('dien thoai'), viet)).toBe(true)
    expect(matches(buildKeywordFilter('Điện thoại'), viet)).toBe(true)
  })

  it('ký tự đặc biệt không làm lỗi và được tìm theo nghĩa đen', () => {
    expect(() => buildKeywordFilter('iphone (')).not.toThrow()
    expect(() => buildKeywordFilter('[a-')).not.toThrow()
    expect(matches(buildKeywordFilter('.*'), phone)).toBe(false)
  })
})
