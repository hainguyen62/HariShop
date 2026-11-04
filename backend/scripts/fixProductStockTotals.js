// Đặt lại tồn kho chung của sản phẩm có màu bằng tổng tồn kho các màu. Chạy: node backend/scripts/fixProductStockTotals.js [--dry]

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Product from '../models/productModel.js'
import { findTotalMismatches } from '../utils/stockTotals.js'

dotenv.config()

const dry = process.argv.includes('--dry')

const run = async () => {
  await connectDB()

  const products = await Product.find({ 'colors.0': { $exists: true } }).select('name countInStock colors.countInStock').lean()
  const mismatches = findTotalMismatches(products)

  for (const m of mismatches) {
    console.log(`${m.name}: đang lưu ${m.stored}, tổng theo màu ${m.expected}`)
    if (!dry) await Product.updateOne({ _id: m.id }, { $set: { countInStock: m.expected } })
  }

  console.log(`${dry ? 'Sẽ sửa' : 'Đã sửa'} ${mismatches.length}/${products.length} sản phẩm có màu.`)
  process.exit(0)
}

run().catch((e) => {
  console.error('Lỗi khi sửa tồn kho chung:', e)
  process.exit(1)
})
