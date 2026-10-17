// Gán mã sản phẩm cho các sản phẩm cũ chưa có, theo thứ tự ngày tạo.
// Chạy từ thư mục backend/:  node scripts/backfillProductCodes.js
// An toàn chạy nhiều lần: chỉ đụng tới sản phẩm chưa có productCode.

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Product from '../models/productModel.js'
import { nextProductCode } from '../utils/orderCode.js'

dotenv.config()

const run = async () => {
  await connectDB()

  const products = await Product.find({ productCode: { $exists: false } })
    .select('_id name')
    .sort({ createdAt: 1 })
    .lean()
  console.log(`Có ${products.length} sản phẩm chưa có mã, bắt đầu gán...`)

  for (const p of products) {
    const code = await nextProductCode(p.name)
    await Product.updateOne({ _id: p._id }, { $set: { productCode: code } })
  }
  console.log(`Đã gán mã cho ${products.length} sản phẩm.`)
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
