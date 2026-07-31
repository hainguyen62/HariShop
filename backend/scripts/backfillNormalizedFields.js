// Script chạy 1 lần để điền nameNormalized/brandNormalized cho các sản phẩm
// ĐÃ TỒN TẠI TRƯỚC KHI có tính năng tìm kiếm thông minh — vì pre('save') chỉ
// tự tính khi document được save lại, sản phẩm cũ trong DB sẽ không tự có
// 2 trường này nếu không chạy qua script này một lần.
//
// Cách chạy (từ thư mục backend/):
//   node scripts/backfillNormalizedFields.js
//
// An toàn để chạy nhiều lần (chỉ ghi đè lại đúng giá trị chuẩn hóa, không
// đổi dữ liệu nào khác của sản phẩm).

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Product from '../models/productModel.js'
import { normalizeForSearch } from '../utils/vietnameseNormalize.js'

dotenv.config()

const run = async () => {
  await connectDB()

  const products = await Product.find({}, '_id name brand')
  console.log(`Tìm thấy ${products.length} sản phẩm, bắt đầu backfill...`)

  let updated = 0
  for (const p of products) {
    await Product.updateOne(
      { _id: p._id },
      {
        $set: {
          nameNormalized: normalizeForSearch(p.name),
          brandNormalized: normalizeForSearch(p.brand),
        },
      }
    )
    updated += 1
  }

  console.log(`✅ Đã cập nhật xong ${updated}/${products.length} sản phẩm.`)
  process.exit(0)
}

run().catch((e) => {
  console.error('❌ Lỗi khi backfill:', e)
  process.exit(1)
})