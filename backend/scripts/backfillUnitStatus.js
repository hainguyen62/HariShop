// Gán trạng thái cho tem cũ: tem chưa có status thành in_stock; đơn đã giao trước đây gán tem theo nhập trước xuất trước.
// Chạy từ thư mục backend/:  node scripts/backfillUnitStatus.js
import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Order from '../models/orderModel.js'
import StockUnit from '../models/stockUnitModel.js'
import { assignUnitsForOrder } from '../utils/unitStatus.js'

dotenv.config()

const run = async () => {
  await connectDB()
  const r = await StockUnit.updateMany({ status: { $exists: false } }, { $set: { status: 'in_stock' } })
  console.log(`Đặt in_stock cho ${r.modifiedCount} tem.`)
  const orders = await Order.find({ status: 'delivered', 'unitCodes.0': { $exists: false } }).sort({ deliveredAt: 1 })
  let n = 0
  for (const o of orders) {
    const codes = await assignUnitsForOrder(o)
    if (codes.length) { await o.save(); n += 1 }
  }
  console.log(`Đã gán tem cho ${n} đơn đã giao.`)
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
