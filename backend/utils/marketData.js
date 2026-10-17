// Lớp nguồn dữ liệu giá. Mỗi nguồn là một object:
//   { name, kind: 'cost' | 'market', fetchMany(products) -> Map(productId -> [{ date, price }]) }
// 'cost' là giá nhập, 'market' là giá thị trường bên ngoài. Muốn thêm nguồn mới (API, file khác),
// viết một nguồn theo mẫu này rồi gọi registerMarketProvider, phần dự báo không cần sửa.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import StockImport from '../models/stockImportModel.js'
import { normalizeForSearch } from './vietnameseNormalize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = process.env.MARKET_PRICE_CSV || path.join(__dirname, '..', 'data', 'market_prices.csv')

// Giá nhập thực tế từ các phiếu nhập của shop
export const importHistoryProvider = {
  name: 'import-history',
  kind: 'cost',
  async fetchMany() {
    const rows = await StockImport.find({}).select('product unitCost importedAt').sort({ importedAt: 1 }).lean()
    const map = new Map()
    for (const r of rows) {
      const key = String(r.product)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push({ date: r.importedAt, price: r.unitCost })
    }
    return map
  },
}

// Giá thị trường nhập tay từ file CSV: product,date,price (product là tên sản phẩm hoặc _id)
export const parseMarketCsv = (text, products) => {
  const byId = new Map(products.map((p) => [String(p._id), String(p._id)]))
  const byName = products.map((p) => ({ id: String(p._id), norm: normalizeForSearch(p.name) }))
  const map = new Map()
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    const parts = line.split(',').map((s) => s.trim())
    if (parts.length < 3) continue
    const [product, dateStr, priceStr] = parts
    const date = new Date(dateStr)
    const price = Number(priceStr)
    if (Number.isNaN(date.getTime()) || !Number.isFinite(price) || price <= 0) continue
    let id = byId.get(product)
    if (!id) {
      const norm = normalizeForSearch(product)
      id = byName.find((p) => p.norm === norm)?.id
    }
    if (!id) continue
    if (!map.has(id)) map.set(id, [])
    map.get(id).push({ date, price })
  }
  for (const list of map.values()) list.sort((a, b) => a.date - b.date)
  return map
}

export const csvMarketProvider = {
  name: 'csv-market',
  kind: 'market',
  async fetchMany(products) {
    if (!fs.existsSync(CSV_PATH)) return new Map()
    return parseMarketCsv(fs.readFileSync(CSV_PATH, 'utf8'), products)
  },
}

const providers = [importHistoryProvider, csvMarketProvider]

export const registerMarketProvider = (provider) => {
  providers.push(provider)
}

// Trả về { cost: Map, market: Map }; nhiều nguồn cùng loại được gộp và sắp theo ngày
export const loadPriceSeries = async (products) => {
  const result = { cost: new Map(), market: new Map() }
  for (const provider of providers) {
    let data
    try {
      data = await provider.fetchMany(products)
    } catch (e) {
      continue
    }
    const target = result[provider.kind]
    if (!target) continue
    for (const [id, points] of data) {
      target.set(id, [...(target.get(id) || []), ...points].sort((a, b) => new Date(a.date) - new Date(b.date)))
    }
  }
  return result
}
