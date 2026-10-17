import Product from '../models/productModel.js'
import StockUnit from '../models/stockUnitModel.js'
import { nextProductCode } from './orderCode.js'
import { allocateUnitCodes, colorCodeFor } from './unitCode.js'

// Đảm bảo sản phẩm có mã; phải gọi trước khi mở transaction có ghi vào sản phẩm
export const ensureProductCode = async (product) => {
  if (product.productCode) return product.productCode
  const code = await nextProductCode(product.name)
  await Product.updateOne({ _id: product._id, productCode: { $exists: false } }, { $set: { productCode: code } })
  const fresh = await Product.findById(product._id).select('productCode').lean()
  product.productCode = fresh.productCode
  return fresh.productCode
}

export const createUnits = async ({ product, color, quantity, lotCode = '', importRecord, importedAt = new Date(), session }) => {
  const colorCode = colorCodeFor(product, color)
  const codes = await allocateUnitCodes(product.productCode, colorCode, quantity, importedAt)
  const docs = codes.map((code) => ({
    code,
    product: product._id,
    productCode: product.productCode,
    color: color || '',
    colorCode,
    lotCode,
    importRecord,
  }))
  await StockUnit.insertMany(docs, session ? { session } : {})
  return docs
}
