import { canIssueInvoice, invoiceNumberOf, addressLine, escapeHtml, buildInvoicePdfBuffer } from '../utils/invoice.js'

const baseOrder = {
  _id: '64f1a2b3c4d5e6f7a8b9c0d1',
  isPaid: false,
  paymentMethod: 'cod',
  createdAt: new Date('2026-09-19T10:20:00Z'),
  orderItems: [{ name: 'Samsung Galaxy S25 Ultra', qty: 2, price: 30000000, color: 'Đen' }],
  shippingAddress: { fullName: 'Nguyễn Văn A', phone: '0900000000', province: 'TP HCM', district: 'Q1', ward: 'P1', detail: '1 Lê Lợi' },
  itemsPrice: 60000000, voucherDiscount: 1000000, voucherCode: 'GIAM1TR', shippingPrice: 30000, totalPrice: 59030000,
  user: { name: 'Nguyễn Văn A', email: 'a@example.com' },
}

describe('canIssueInvoice', () => {
  it('đơn đã thanh toán online thì xuất được', () => {
    expect(canIssueInvoice({ ...baseOrder, isPaid: true, paymentMethod: 'online' })).toBe(true)
  })
  it('đơn COD chưa giao thì chưa xuất', () => {
    expect(canIssueInvoice({ ...baseOrder })).toBe(false)
  })
  it('đơn đã giao thành công thì xuất được', () => {
    expect(canIssueInvoice({ ...baseOrder, status: 'delivered', isDelivered: true })).toBe(true)
  })
  it('đơn đã huỷ không xuất dù đã thanh toán', () => {
    expect(canIssueInvoice({ ...baseOrder, isPaid: true, status: 'cancelled' })).toBe(false)
  })
})

describe('helpers', () => {
  it('số hoá đơn lấy 6 ký tự cuối mã đơn, viết hoa', () => {
    expect(invoiceNumberOf(baseOrder)).toBe('HDB9C0D1')
  })
  it('ghép địa chỉ bỏ phần trống', () => {
    expect(addressLine({ detail: '1 Lê Lợi', ward: 'P1', district: '', province: 'TP HCM' })).toBe('1 Lê Lợi, P1, TP HCM')
  })
  it('escapeHtml chặn chèn HTML từ tên sản phẩm/khách hàng', () => {
    expect(escapeHtml('<script>"x"&</script>')).toBe('&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;')
  })
})

describe('buildInvoicePdfBuffer', () => {
  it('sinh ra file PDF hợp lệ', async () => {
    const buf = await buildInvoicePdfBuffer({ ...baseOrder, isPaid: true })
    expect(buf.slice(0, 5).toString()).toBe('%PDF-')
    expect(buf.length).toBeGreaterThan(2000)
  })
})
