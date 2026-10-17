import { productShortCode, dateStamp, formatOrderCode, formatProductCode, formatLotCode, LOT_CODE_RE, ORDER_CODE_RE } from '../utils/orderCode.js'

describe('productShortCode', () => {
  it('lấy 2 chữ đầu của hãng và mã model có số', () => {
    expect(productShortCode('iPhone 15 Pro Max')).toBe('IP15')
    expect(productShortCode('Samsung Galaxy S24 Ultra')).toBe('SAS24')
    expect(productShortCode('OPPO Find X9 Pro')).toBe('OPX9')
  })
  it('bỏ dấu tiếng Việt và xử lý tên không có số', () => {
    expect(productShortCode('Điện thoại Xiaomi')).toBe('DIT')
    expect(productShortCode('')).toBe('SP')
  })
})

describe('mã đơn', () => {
  it('ngày tính theo giờ Việt Nam', () => {
    expect(dateStamp(new Date('2026-10-04T18:00:00Z'))).toBe('261005')
    expect(dateStamp(new Date('2026-10-04T16:59:00Z'))).toBe('261004')
  })
  it('mã đơn HSO gồm mã SP, màu, STT 5 số và ngày tạo đơn', () => {
    const d = new Date('2026-10-09T03:00:00Z')
    expect(formatOrderCode('HS-RE16', 'BLACK', 7, d)).toBe('HSO-RE16-BLACK-00007-261009')
    expect(formatOrderCode('HS-RE16-2', 'NC', 12, d)).toBe('HSO-RE16-2-NC-00012-261009')
    expect(ORDER_CODE_RE.test('HSO-RE16-BLACK-00007-261009')).toBe(true)
    expect(ORDER_CODE_RE.test('HSO-RE16-2-NC-00012-261009')).toBe(true)
  })
})

describe('isOrderCode', () => {
  it('nhận đúng định dạng mã đơn, từ chối _id và chuỗi lạ', async () => {
    const { isOrderCode } = await import('../utils/orderLookup.js')
    expect(isOrderCode('HS-261005-IP15-0001')).toBe(true)
    expect(isOrderCode('hs-261005-sas24-0012')).toBe(true)
    expect(isOrderCode('hso-re16-black-00007-261009')).toBe(true)
    expect(isOrderCode('HS-RE16-BLACK-00007-261009')).toBe(false)
    expect(isOrderCode('6a62da5919b141938ee17b29')).toBe(false)
    expect(isOrderCode('HS-1-IP-1')).toBe(false)
    expect(isOrderCode('')).toBe(false)
  })
})

describe('formatProductCode', () => {
  it('mã đầu tiên là HS-<mã SP>, mã trùng thêm số thứ tự', () => {
    expect(formatProductCode('iPhone 15 Pro', 1)).toBe('HS-IP15')
    expect(formatProductCode('iPhone 15 Pro', 3)).toBe('HS-IP15-3')
  })
})

describe('mã lô', () => {
  it('dạng LO-<ngày>-<STT> không gắn sản phẩm', () => {
    const code = formatLotCode(new Date('2026-09-21T03:00:00Z'), 2)
    expect(code).toBe('LO-260921-0002')
    expect(LOT_CODE_RE.test(code)).toBe(true)
    expect(LOT_CODE_RE.test('HS-260921-IP15-0002')).toBe(false)
  })
})

describe('phí vận chuyển hóa đơn', () => {
  it('ưu tiên deliveryFee, lùi về shippingPrice', async () => {
    const { shippingFeeOf } = await import('../utils/invoice.js')
    expect(shippingFeeOf({ deliveryFee: 34900, shippingPrice: 0 })).toBe(34900)
    expect(shippingFeeOf({ shippingPrice: 20000 })).toBe(20000)
    expect(shippingFeeOf({})).toBe(0)
  })
})
