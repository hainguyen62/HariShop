// Gán orderCode cho các đơn cũ chưa có mã, theo ngày tạo đơn.
// Chạy từ thư mục backend/:  node scripts/backfillOrderCodes.js
// An toàn chạy nhiều lần: chỉ đụng tới đơn chưa có orderCode.

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Order from '../models/orderModel.js'
import { nextOrderCode } from '../utils/orderCode.js'

dotenv.config()

const run = async () => {
  await connectDB()

  const orders = await Order.find({ orderCode: { $exists: false } })
    .select('_id createdAt orderItems.name')
    .sort({ createdAt: 1 })
    .lean()
  console.log(`Có ${orders.length} đơn chưa có mã, bắt đầu gán...`)

  let done = 0
  for (const o of orders) {
    const code = await nextOrderCode(o.orderItems?.[0]?.name, new Date(o.createdAt))
    await Order.updateOne({ _id: o._id }, { $set: { orderCode: code } })
    done += 1
  }
  console.log(`Đã gán mã cho ${done} đơn.`)
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
