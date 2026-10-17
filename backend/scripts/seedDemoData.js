// Tạo đơn hàng và phiếu nhập mẫu cho vài sản phẩm để demo trang Dự báo nhập hàng.
// Chạy từ thư mục backend/:
//   node scripts/seedDemoData.js           tạo dữ liệu mẫu
//   node scripts/seedDemoData.js --clean   xoá toàn bộ dữ liệu mẫu đã tạo
// Dữ liệu mẫu được gắn nhãn [DEMO]. Script không đổi tồn kho của sản phẩm.

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Product from '../models/productModel.js'
import Order from '../models/orderModel.js'
import User from '../models/userModel.js'
import StockImport from '../models/stockImportModel.js'
import { generateDemoPlan } from '../utils/demoData.js'

dotenv.config()

const TAG = '[DEMO]'

const run = async () => {
  await connectDB()

  if (process.argv.includes('--clean')) {
    const o = await Order.deleteMany({ shopMessage: TAG })
    const i = await StockImport.deleteMany({ note: TAG })
    console.log(`Đã xoá ${o.deletedCount} đơn mẫu và ${i.deletedCount} phiếu nhập mẫu.`)
    process.exit(0)
  }

  const admin = await User.findOne({ isAdmin: true }).select('_id')
  if (!admin) throw new Error('Không tìm thấy tài khoản admin để gán đơn mẫu')

  const products = await Product.find({}).sort({ createdAt: 1 }).limit(8).select('name image price').lean()
  if (products.length === 0) throw new Error('Chưa có sản phẩm nào')

  const plan = generateDemoPlan(products)

  const orderDocs = plan.orders.map((ev) => {
    const p = products[ev.productIdx]
    const doc = new Order({
      user: admin._id,
      orderItems: [{ name: p.name, qty: ev.qty, image: p.image, price: p.price, product: p._id }],
      shippingAddress: { fullName: 'Khách demo', phone: '0900000000', province: 'TP.HCM', ward: 'Demo', detail: 'Demo' },
      paymentMethod: 'cod',
      itemsPrice: p.price * ev.qty,
      totalPrice: p.price * ev.qty,
      status: 'delivered',
      isDelivered: true,
      deliveredAt: ev.date,
      shopMessage: TAG,
    }).toObject()
    doc.createdAt = ev.date
    doc.updatedAt = ev.date
    return doc
  })
  await Order.collection.insertMany(orderDocs)

  const importDocs = plan.imports.map((im) => {
    const p = products[im.productIdx]
    const doc = new StockImport({
      product: p._id,
      productName: p.name,
      quantity: im.qty,
      unitCost: im.cost,
      totalCost: im.qty * im.cost,
      note: TAG,
      importedAt: im.date,
      createdBy: admin._id,
    }).toObject()
    doc.createdAt = im.date
    doc.updatedAt = im.date
    return doc
  })
  await StockImport.collection.insertMany(importDocs)

  console.log(`Đã tạo ${orderDocs.length} đơn mẫu và ${importDocs.length} phiếu nhập mẫu cho ${products.length} sản phẩm.`)
  console.log('Xoá bằng: node scripts/seedDemoData.js --clean')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
