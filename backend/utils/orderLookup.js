import mongoose from 'mongoose'
import Order from '../models/orderModel.js'
import { ORDER_CODE_RE, LEGACY_ORDER_CODE_RE } from './orderCode.js'

// Nhận cả mã mới HSO-... lẫn mã cũ HS-<YYMMDD>-...
export const isOrderCode = (value) => {
  const v = String(value || '').trim().toUpperCase()
  return ORDER_CODE_RE.test(v) || LEGACY_ORDER_CODE_RE.test(v)
}

// Đổi mã đơn dạng HS-... hoặc _id thành _id; trả null nếu không tìm thấy
export const resolveOrderId = async (value) => {
  const v = String(value || '').trim()
  if (mongoose.Types.ObjectId.isValid(v) && /^[a-f0-9]{24}$/i.test(v)) return v
  if (!isOrderCode(v)) return null
  const code = v.toUpperCase()
  const found = await Order.findOne({ $or: [{ orderCode: code }, { legacyOrderCode: code }] }).select('_id').lean()
  return found ? String(found._id) : null
}

// Gắn vào router.param('id') để mọi route /:id nhận được cả mã đơn lẫn _id
export const orderIdParam = async (req, res, next, value) => {
  try {
    const id = await resolveOrderId(value)
    if (id) req.params.id = id
    next()
  } catch (e) {
    next(e)
  }
}
