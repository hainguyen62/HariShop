// Đặt lại ảnh các dòng đơn cũ theo màu đã chọn. Chạy: node backend/scripts/fixOrderItemImages.js [--dry]

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Order from '../models/orderModel.js'
import Product from '../models/productModel.js'
import { colorImageOf } from '../utils/colorPricing.js'

dotenv.config()

const dry = process.argv.includes('--dry')

const run = async () => {
  await connectDB()

  const products = await Product.find({ 'colors.0': { $exists: true } }).select('image colors.name colors.image').lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))

  const orders = await Order.find({ 'orderItems.color': { $nin: ['', null] } }).select('orderItems.product orderItems.color orderItems.image').lean()
  let changed = 0
  for (const order of orders) {
    const set = {}
    order.orderItems.forEach((item, i) => {
      const product = byId.get(String(item.product))
      if (!product || !item.color) return
      const image = colorImageOf(product, item.color)
      if (image && image !== item.image) set[`orderItems.${i}.image`] = image
    })
    const n = Object.keys(set).length
    if (n === 0) continue
    changed += n
    if (!dry) await Order.updateOne({ _id: order._id }, { $set: set })
  }

  console.log(`${dry ? 'Sẽ cập nhật' : 'Đã cập nhật'} ${changed} dòng hàng trong ${orders.length} đơn có chọn màu.`)
  process.exit(0)
}

run().catch((e) => {
  console.error('Lỗi khi cập nhật ảnh đơn hàng:', e)
  process.exit(1)
})
