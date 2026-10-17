import PDFDocument from 'pdfkit'
import path from 'path'
import { fileURLToPath } from 'url'
import { getCurrentOrderStatus } from '../config/orderStatusConfig.js'

// Phí vận chuyển thực tế: checkout lưu ở deliveryFee, shippingPrice là trường cũ
export const shippingFeeOf = (order) => Number(order.deliveryFee) || Number(order.shippingPrice) || 0

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FONT_REGULAR = path.join(__dirname, '../assets/fonts/BeVietnamPro-Regular.ttf')
const FONT_BOLD = path.join(__dirname, '../assets/fonts/BeVietnamPro-Bold.ttf')

const NOT_BILLABLE = ['cancelled', 'returning', 'returned', 'delivery_failed']

export const canIssueInvoice = (order) => {
  const status = getCurrentOrderStatus(order)
  if (NOT_BILLABLE.includes(status)) return false
  return Boolean(order.isPaid) || status === 'delivered'
}

export const orderLabelOf = (order) =>
  order.orderCode || `#${String(order._id).slice(-6).toUpperCase()}`

export const invoiceNumberOf = (order) => `HD${String(order._id).slice(-6).toUpperCase()}`

export const formatMoney = (n) => `${(Number(n) || 0).toLocaleString('vi-VN')}đ`

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const paymentLabel = (order) => {
  if (order.partialCod && !order.isPaid) {
    return `Đã chuyển khoản ${formatMoney(order.paymentReceivedAmount)}, còn ${formatMoney(order.codRemainderAmount)} thu khi nhận hàng`
  }
  const method = order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản QR (SePay)'
  return `${method} — ${order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}`
}

export const addressLine = (a = {}) =>
  [a.detail, a.ward, a.district, a.province].filter(Boolean).join(', ')

// order cần populate('user', 'name email')
export const buildInvoicePdfBuffer = (order) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    doc.registerFont('VN', FONT_REGULAR)
    doc.registerFont('VN-Bold', FONT_BOLD)
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width
    const C = { primary: '#0fa37f', dark: '#1b1b32', gray: '#6b7085', line: '#dddddd' }
    const addr = order.shippingAddress || {}

    doc.rect(0, 0, W, 90).fill(C.dark)
    doc.fillColor('#22e3b6').font('VN-Bold').fontSize(22).text('HARI SHOP', 40, 28)
    doc.fillColor('#ffffff').font('VN').fontSize(10).text('Cửa hàng điện thoại chính hãng', 40, 56)
    doc.fillColor('#ffffff').font('VN-Bold').fontSize(18).text('HÓA ĐƠN BÁN HÀNG', 0, 30, { width: W - 40, align: 'right' })
    doc.font('VN').fontSize(10).fillColor('#cfd3e0')
      .text(`Số: ${invoiceNumberOf(order)}`, 0, 56, { width: W - 40, align: 'right' })

    let y = 110
    doc.fillColor(C.dark).font('VN-Bold').fontSize(11).text('Thông tin đơn hàng', 40, y)
    doc.font('VN').fontSize(10).fillColor('#333')
    y += 18
    doc.text(`Mã đơn hàng: ${orderLabelOf(order)}`, 40, y)
    doc.text(`Ngày đặt: ${new Date(order.createdAt).toLocaleString('vi-VN')}`, 300, y)
    y += 15
    doc.text(`Ngày xuất hoá đơn: ${new Date().toLocaleString('vi-VN')}`, 40, y)
    doc.text(`Thanh toán: ${paymentLabel(order)}`, 300, y, { width: W - 340 })
    y += 30

    doc.fillColor(C.dark).font('VN-Bold').fontSize(11).text('Khách hàng', 40, y)
    doc.font('VN').fontSize(10).fillColor('#333')
    y += 18
    doc.text(`Họ tên: ${addr.fullName || order.user?.name || ''}`, 40, y)
    doc.text(`Điện thoại: ${addr.phone || ''}`, 300, y)
    y += 15
    doc.text(`Email: ${order.user?.email || ''}`, 40, y)
    y += 15
    doc.text(`Địa chỉ giao hàng: ${addressLine(addr)}`, 40, y, { width: W - 80 })
    y = doc.y + 16

    const cols = { stt: 40, name: 68, color: 300, qty: 365, price: 400, total: 485 }
    const drawHead = () => {
      doc.rect(40, y - 4, W - 80, 20).fill(C.dark)
      doc.fillColor('#ffffff').font('VN-Bold').fontSize(9)
      doc.text('STT', cols.stt + 4, y, { width: 24, lineBreak: false })
      doc.text('Sản phẩm', cols.name, y, { width: 225, lineBreak: false })
      doc.text('Màu', cols.color, y, { width: 60, lineBreak: false })
      doc.text('SL', cols.qty, y, { width: 30, align: 'right', lineBreak: false })
      doc.text('Đơn giá', cols.price, y, { width: 80, align: 'right', lineBreak: false })
      doc.text('Thành tiền', cols.total, y, { width: W - 40 - cols.total, align: 'right', lineBreak: false })
      y += 22
    }
    drawHead()

    doc.font('VN').fontSize(9.5)
    ;(order.orderItems || []).forEach((it, idx) => {
      const nameH = doc.heightOfString(it.name || '', { width: 225 })
      const rowH = Math.max(nameH, 12) + 8
      if (y + rowH > doc.page.height - 150) { doc.addPage(); y = 50; drawHead(); doc.font('VN').fontSize(9.5) }
      if (idx % 2 === 1) doc.rect(40, y - 3, W - 80, rowH).fill('#f5f7fa')
      doc.fillColor('#333')
      doc.text(String(idx + 1), cols.stt + 4, y, { width: 24, lineBreak: false })
      doc.text(it.name || '', cols.name, y, { width: 225 })
      doc.text(it.color || '—', cols.color, y, { width: 60, lineBreak: false })
      doc.text(String(it.qty), cols.qty, y, { width: 30, align: 'right', lineBreak: false })
      doc.text(formatMoney(it.price), cols.price, y, { width: 80, align: 'right', lineBreak: false })
      doc.text(formatMoney((Number(it.price) || 0) * (Number(it.qty) || 0)), cols.total, y, { width: W - 40 - cols.total, align: 'right', lineBreak: false })
      y += rowH
    })
    doc.moveTo(40, y).lineTo(W - 40, y).strokeColor(C.line).stroke()
    y += 12

    if (y > doc.page.height - 170) { doc.addPage(); y = 50 }
    const sumRow = (label, value, opts = {}) => {
      doc.font(opts.bold ? 'VN-Bold' : 'VN').fontSize(opts.big ? 12 : 10).fillColor(opts.color || '#333')
      doc.text(label, 300, y, { width: 130, lineBreak: false })
      doc.text(value, 430, y, { width: W - 40 - 430, align: 'right', lineBreak: false })
      y += opts.big ? 22 : 17
    }
    sumRow('Tạm tính', formatMoney(order.itemsPrice))
    if (Number(order.voucherDiscount) > 0) {
      sumRow(`Giảm giá${order.voucherCode ? ` (${order.voucherCode})` : ''}`, `-${formatMoney(order.voucherDiscount)}`)
    }
    sumRow('Phí vận chuyển', formatMoney(shippingFeeOf(order)))
    if (Number(order.taxPrice) > 0) sumRow('Thuế', formatMoney(order.taxPrice))
    doc.moveTo(300, y).lineTo(W - 40, y).strokeColor(C.line).stroke()
    y += 8
    sumRow('TỔNG THANH TOÁN', formatMoney(order.totalPrice), { bold: true, big: true, color: C.primary })

    doc.font('VN').fontSize(9).fillColor(C.gray)
      .text('Cảm ơn quý khách đã mua hàng tại HariShop. Hoá đơn này được tạo tự động từ hệ thống.', 40, doc.page.height - 70, { width: W - 80, align: 'center' })

    doc.end()
  })
