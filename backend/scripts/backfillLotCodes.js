// Gán mã lô LO-<ngày nhập>-<STT> cho phiếu nhập chưa có mã hoặc còn mã lô dạng cũ (HS-...).
// Chạy từ thư mục backend/:  node scripts/backfillLotCodes.js
// Mỗi phiếu cũ nhận một lô riêng vì không biết phiếu nào cùng chuyến hàng.

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import StockImport from '../models/stockImportModel.js'
import { nextLotCode } from '../utils/orderCode.js'

dotenv.config()

const run = async () => {
  await connectDB()

  try { await StockImport.collection.dropIndex('lotCode_1') } catch (e) { /* chưa có index cũ */ }
  await StockImport.syncIndexes()

  const records = await StockImport.find({ $or: [{ lotCode: { $exists: false } }, { lotCode: /^HS-/ }] })
    .select('_id productName importedAt')
    .sort({ importedAt: 1, createdAt: 1 })
    .lean()
  console.log(`Có ${records.length} phiếu nhập chưa có mã lô, bắt đầu gán...`)

  for (const r of records) {
    const code = await nextLotCode(new Date(r.importedAt))
    await StockImport.updateOne({ _id: r._id }, { $set: { lotCode: code } })
  }
  console.log(`Đã gán mã lô cho ${records.length} phiếu.`)
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
