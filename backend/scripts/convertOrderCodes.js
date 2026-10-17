// Đổi mã đơn cũ HS-<YYMMDD>-<SP>-<STT> sang HSO-<SP>-<màu>-<STT>-<YYMMDD>; mã cũ lưu ở legacyOrderCode.
// Chạy từ thư mục backend/:  node scripts/convertOrderCodes.js
// An toàn chạy nhiều lần: chỉ đổi đơn còn mã dạng cũ hoặc chưa có mã.

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Order from '../models/orderModel.js'
import Product from '../models/productModel.js'
import { LEGACY_ORDER_CODE_RE } from '../utils/orderCode.js'
import { buildOrderCode } from '../utils/unitStatus.js'

dotenv.config()

const run = async () => {
  await connectDB()

  const orders = await Order.find({
    $or: [{ orderCode: { $exists: false } }, { orderCode: { $regex: '^HS-\\d{6}-' } }],
  })
    .select('_id createdAt orderCode orderItems.product orderItems.color orderItems.name')
    .sort({ createdAt: 1 })
    .lean()
  console.log(`Có ${orders.length} đơn cần đổi mã, bắt đầu...`)

  let done = 0
  let skipped = 0
  for (const o of orders) {
    const first = o.orderItems?.[0]
    const product = first ? await Product.findById(first.product) : null
    if (!product) {
      skipped += 1
      continue
    }
    const code = await buildOrderCode(first, product, new Date(o.createdAt))
    const $set = { orderCode: code }
    if (o.orderCode && LEGACY_ORDER_CODE_RE.test(o.orderCode)) $set.legacyOrderCode = o.orderCode
    await Order.updateOne({ _id: o._id }, { $set })
    done += 1
  }
  console.log(`Đã đổi ${done} đơn, bỏ qua ${skipped} đơn do sản phẩm không còn.`)
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
