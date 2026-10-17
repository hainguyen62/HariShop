import asyncHandler from 'express-async-handler'
import Order from '../models/orderModel.js'
import createTransporter from '../config/emailConfig.js'
import logger from '../utils/logger.js'
import {
  buildInvoicePdfBuffer,
  canIssueInvoice,
  invoiceNumberOf,
  orderLabelOf,
  formatMoney,
  escapeHtml,
  addressLine,
  shippingFeeOf,
} from '../utils/invoice.js'

const loadOrderForInvoice = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email')
  if (!order) {
    res.status(404)
    throw new Error('Không tìm thấy đơn hàng')
  }
  const isOwner = order.user && String(order.user._id) === String(req.user._id)
  if (!req.user.isAdmin && !isOwner) {
    res.status(401)
    throw new Error('Không có quyền xem hoá đơn của đơn hàng này')
  }
  if (!canIssueInvoice(order)) {
    res.status(400)
    throw new Error('Chỉ xuất hoá đơn cho đơn đã thanh toán hoặc đã giao thành công')
  }
  return order
}

const buildInvoiceEmailHtml = (order) => {
  const rows = (order.orderItems || [])
    .map(
      (it) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(it.name)}${it.color ? ` <span style="color:#888;">(${escapeHtml(it.color)})</span>` : ''}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${it.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatMoney(it.price)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatMoney((it.price || 0) * (it.qty || 0))}</td>
        </tr>`
    )
    .join('')

  const addr = order.shippingAddress || {}
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;">
      <h2 style="color:#0fa37f;">Chào ${escapeHtml(order.user?.name || addr.fullName)},</h2>
      <p>HariShop gửi bạn hoá đơn <strong>${invoiceNumberOf(order)}</strong> cho đơn hàng <strong>#${String(order._id).slice(-6).toUpperCase()}</strong>. File PDF đầy đủ được đính kèm trong email này.</p>
      <p><strong>Người nhận:</strong> ${escapeHtml(addr.fullName)} — ${escapeHtml(addr.phone)}<br>
         <strong>Địa chỉ:</strong> ${escapeHtml(addressLine(addr))}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#1b1b32;color:#fff;">
            <th style="padding:8px;text-align:left;">Sản phẩm</th>
            <th style="padding:8px;">SL</th>
            <th style="padding:8px;text-align:right;">Đơn giá</th>
            <th style="padding:8px;text-align:right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="text-align:right;margin:12px 0 0;">
        Tạm tính: ${formatMoney(order.itemsPrice)}<br>
        ${Number(order.voucherDiscount) > 0 ? `Giảm giá: -${formatMoney(order.voucherDiscount)}<br>` : ''}
        Phí vận chuyển: ${formatMoney(shippingFeeOf(order))}<br>
        <strong style="font-size:18px;color:#0fa37f;">Tổng thanh toán: ${formatMoney(order.totalPrice)}</strong>
        ${order.partialCod && !order.isPaid ? `<br>Đã chuyển khoản: ${formatMoney(order.paymentReceivedAmount)}<br>Còn thu khi nhận hàng: ${formatMoney(order.codRemainderAmount)}` : ''}
      </p>
      <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
      <p style="color:#777;font-size:12px;">Trân trọng,<br>HariShop Team</p>
    </div>`
}

// @desc    Tải hoá đơn PDF (admin hoặc chủ đơn hàng)
// @route   GET /api/orders/:id/invoice
// @access  Private
const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await loadOrderForInvoice(req, res)
  const pdf = await buildInvoicePdfBuffer(order)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="hoa-don-${invoiceNumberOf(order)}.pdf"`)
  res.send(pdf)
})

// @desc    Gửi hoá đơn PDF tới email của khách hàng
// @route   POST /api/orders/:id/invoice/send
// @access  Private/Admin
const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const order = await loadOrderForInvoice(req, res)

  const gmailUser = (process.env.GMAIL_USER || '').trim()
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
  if (!gmailUser || !gmailPass) {
    res.status(500)
    throw new Error('Chưa cấu hình GMAIL_USER / GMAIL_APP_PASSWORD trên server')
  }
  const to = order.user?.email
  if (!to) {
    res.status(400)
    throw new Error('Tài khoản đặt đơn không có email để gửi hoá đơn')
  }

  const pdf = await buildInvoicePdfBuffer(order)
  try {
    await createTransporter().sendMail({
      from: `"HariShop" <${gmailUser}>`,
      to,
      subject: `HariShop - Hoá đơn ${invoiceNumberOf(order)} (đơn hàng ${orderLabelOf(order)})`,
      html: buildInvoiceEmailHtml(order),
      attachments: [{ filename: `hoa-don-${invoiceNumberOf(order)}.pdf`, content: pdf, contentType: 'application/pdf' }],
    })
  } catch (e) {
    logger.error(`Gửi hoá đơn thất bại: ${e.message}`)
    res.status(502)
    throw new Error('Không gửi được email hoá đơn, vui lòng kiểm tra cấu hình email và thử lại')
  }

  order.invoiceSentAt = new Date()
  order.invoiceSentTo = to
  order.invoiceSentCount = (order.invoiceSentCount || 0) + 1
  await order.save()

  res.json({ invoiceSentAt: order.invoiceSentAt, invoiceSentTo: order.invoiceSentTo, invoiceSentCount: order.invoiceSentCount })
})

export { downloadInvoice, sendInvoiceEmail }
