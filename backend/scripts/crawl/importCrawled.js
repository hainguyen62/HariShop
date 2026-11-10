// Nạp products.json vào cơ sở dữ liệu, mặc định chỉ liệt kê, thêm --apply mới ghi thật

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import 'colors'
import connectDB from '../../config/db.js'
import Product from '../../models/productModel.js'
import User from '../../models/userModel.js'
import { nextProductCode } from '../../utils/orderCode.js'
import { normalizeForSearch } from '../../utils/vietnameseNormalize.js'
import { describeFromSpecs, guessHex } from '../../utils/crawlParse.js'

dotenv.config()

const here = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(here, '..', '..', 'data', 'crawled', 'products.json')
const PLACEHOLDER = '/images/placeholder.svg'
const apply = process.argv.includes('--apply')
const refresh = process.argv.includes('--refresh')

const run = async () => {
  const items = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  await connectDB()
  const admin = await User.findOne({ isAdmin: true }).select('_id')
  if (!admin) throw new Error('Chưa có tài khoản admin để gán làm người tạo')

  let added = 0
  let skipped = 0
  let updated = 0
  for (const it of items) {
    if (!it.name || !it.brand || !(it.price > 0)) {
      console.log(`Thiếu dữ liệu, bỏ qua: ${it.sourceUrl}`)
      skipped++
      continue
    }
    const old = await Product.findOne({ nameNormalized: normalizeForSearch(it.name) })
    if (old && refresh) {
      console.log(`${apply ? 'Cập nhật' : 'Sẽ cập nhật'}: ${it.name} | ${old.colors.length} màu -> ${it.colors.length} màu | giá ${it.price}`)
      if (apply) {
        // Giữ ảnh và tồn kho của màu trùng tên, màu không còn trong dữ liệu mới bị bỏ
        old.colors = it.colors.map((c) => {
          const prev = old.colors.find((o) => o.name === c.name)
          return { name: c.name, price: c.price, countInStock: prev ? prev.countInStock : 0, image: prev ? prev.image : '', hexCode: prev && prev.hexCode !== '#888888' ? prev.hexCode : guessHex(c.name) }
        })
        old.price = it.price
        await old.save()
        updated++
      }
      continue
    }
    if (old) {
      console.log(`Đã có: ${it.name}`)
      skipped++
      continue
    }
    console.log(`${apply ? 'Thêm' : 'Sẽ thêm'}: ${it.name} | ${it.brand} | ${it.price} | ${it.colors.length} màu`)
    if (!apply) continue

    const product = new Product({
      user: admin._id,
      name: it.name,
      brand: it.brand,
      category: 'Điện thoại',
      image: PLACEHOLDER,
      description: describeFromSpecs(it.name, it.specs),
      price: it.price,
      weight: it.weight || 0,
      specs: it.specs,
      colors: it.colors.map((c) => ({ name: c.name, price: c.price, hexCode: guessHex(c.name), countInStock: 0, image: '' })),
      countInStock: 0,
    })
    product.productCode = await nextProductCode(product.name)
    await product.save()
    added++
  }
  console.log(`${apply ? 'Đã thêm' : 'Có thể thêm'} ${apply ? added : items.length - skipped} sản phẩm, cập nhật ${updated}, bỏ qua ${skipped}`)
  await mongoose.disconnect()
}

run().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
