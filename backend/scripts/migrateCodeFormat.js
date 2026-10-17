// Đổi mã sang định dạng mới cho dữ liệu đã tạo trước đó.
//   Mã sản phẩm: HS-OPX9-0001 -> HS-OPX9, HS-OPX9-0002 -> HS-OPX9-2
//   Mã tem:      HS-OPX9-0001-00007 -> HS-OPX9-WHITE-00007-261005 (cũng đổi mã màu cũ như TRA thành WHITE)
// Chạy từ thư mục backend/:  node scripts/migrateCodeFormat.js
// An toàn chạy nhiều lần: chỉ đổi những mã còn ở định dạng cũ. Tem đã in theo mã cũ cần in lại.

import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Product from '../models/productModel.js'
import StockUnit from '../models/stockUnitModel.js'
import { CountScan } from '../models/countSessionModel.js'
import Counter from '../models/counterModel.js'
import { allocateUnitCodes, colorCodeFor } from '../utils/unitCode.js'

dotenv.config()

const OLD_PRODUCT = /^HS-([A-Z0-9]{2,8})-(\d{4,})$/
const OLD_UNIT = /^HS-[A-Z0-9]{2,8}-\d{4,}-\d{5,}$/

const run = async () => {
  await connectDB()

  const products = await Product.find({ productCode: { $regex: OLD_PRODUCT } }).select('productCode').lean()
  for (const p of products) {
    const [, short, num] = p.productCode.match(OLD_PRODUCT)
    const n = parseInt(num, 10)
    const next = n <= 1 ? `HS-${short}` : `HS-${short}-${n}`
    await Product.updateOne({ _id: p._id }, { $set: { productCode: next } })
  }
  console.log(`Đã đổi mã cho ${products.length} sản phẩm.`)

  const units = await StockUnit.find({ code: { $regex: OLD_UNIT } }).sort({ createdAt: 1, code: 1 }).lean()
  const productCache = new Map()
  let changed = 0
  for (const u of units) {
    let product = productCache.get(String(u.product))
    if (!product) {
      product = await Product.findById(u.product).select('productCode colors.name').lean()
      productCache.set(String(u.product), product)
    }
    if (!product || !product.productCode) continue
    const colorCode = colorCodeFor(product, u.color)
    const [code] = await allocateUnitCodes(product.productCode, colorCode, 1, u.createdAt)
    await StockUnit.updateOne({ _id: u._id }, { $set: { code, productCode: product.productCode, colorCode } })
    await CountScan.updateMany({ code: u.code }, { $set: { code } })
    changed += 1
  }
  console.log(`Đã đổi mã cho ${changed} tem.`)

  // Tem đã ở định dạng mới nhưng mã màu cũ (TRA, DEN...): đổi đoạn màu, giữ số thứ tự và ngày
  const NEW_UNIT = /^(HS-[A-Z0-9]{2,8}(?:-\d{1,4})?)-([A-Z][A-Z0-9]*)-(\d{5})-(\d{6})$/
  const current = await StockUnit.find({ code: { $regex: NEW_UNIT } }).select('code product color colorCode').lean()
  let recolored = 0
  for (const u of current) {
    let product = productCache.get(String(u.product))
    if (!product) {
      product = await Product.findById(u.product).select('productCode colors.name').lean()
      productCache.set(String(u.product), product)
    }
    if (!product) continue
    const colorCode = colorCodeFor(product, u.color)
    const [, prefix, oldColor, seq, day] = u.code.match(NEW_UNIT)
    if (oldColor === colorCode) continue
    const code = `${prefix}-${colorCode}-${seq}-${day}`
    await StockUnit.updateOne({ _id: u._id }, { $set: { code, colorCode } })
    await CountScan.updateMany({ code: u.code }, { $set: { code } })
    await Counter.updateOne({ _id: `unit-${prefix}-${colorCode}` }, { $max: { seq: Number(seq) } }, { upsert: true })
    recolored += 1
  }
  console.log(`Đã đổi mã màu cho ${recolored} tem.`)
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
