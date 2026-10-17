import StockUnit from '../models/stockUnitModel.js'
import Product from '../models/productModel.js'
import { ensureProductCode } from './units.js'
import { colorCodeFor } from './unitCode.js'
import { nextOrderCode } from './orderCode.js'

export const UNIT_STATUS = { IN_STOCK: 'in_stock', SOLD: 'sold', VOID: 'void' }

// Mã đơn mới theo mặt hàng đầu tiên; sản phẩm chưa có mã thì cấp mã trước
export const buildOrderCode = async (firstItem, productDoc, date = new Date()) => {
  if (!productDoc) return null
  await ensureProductCode(productDoc)
  const colorCode = colorCodeFor(productDoc, firstItem?.color || '')
  return nextOrderCode(productDoc.productCode, colorCode, date)
}

// Gán tem theo máy nhập trước xuất trước khi đơn giao thành công; chỉ chạy một lần mỗi đơn
export const assignUnitsForOrder = async (order) => {
  if (!order || order.exportedAt || (order.unitCodes && order.unitCodes.length > 0)) return []
  const codes = []
  try {
    const ids = [...new Set((order.orderItems || []).map((i) => String(i.product)))]
    const products = await Product.find({ _id: { $in: ids } }).select('colors.name').lean()
    const hasColors = new Map(products.map((p) => [String(p._id), Array.isArray(p.colors) && p.colors.length > 0]))
    for (const item of order.orderItems || []) {
      // Sản phẩm không có màu: giỏ hàng ghi "Mặc định" nhưng tem lưu màu rỗng
      const color = hasColors.get(String(item.product)) ? item.color || '' : ''
      for (let i = 0; i < item.qty; i += 1) {
        const unit = await StockUnit.findOneAndUpdate(
          { product: item.product, color, status: UNIT_STATUS.IN_STOCK },
          { $set: { status: UNIT_STATUS.SOLD, soldOrder: order._id, soldAt: new Date() } },
          { sort: { createdAt: 1, code: 1 }, new: true }
        )
        if (!unit) break
        codes.push(unit.code)
      }
    }
    order.unitCodes = codes
  } catch (e) {
    console.error('❌ Lỗi gán tem cho đơn (non-fatal):', e.message)
  }
  return codes
}

// Đơn hủy hoặc hoàn về: máy quay lại kho, mã tem giữ nguyên
export const releaseUnitsForOrder = async (order) => {
  if (!order || !order.unitCodes || order.unitCodes.length === 0) return 0
  try {
    const res = await StockUnit.updateMany(
      { code: { $in: order.unitCodes }, status: UNIT_STATUS.SOLD },
      { $set: { status: UNIT_STATUS.IN_STOCK }, $unset: { soldOrder: '', soldAt: '' } }
    )
    order.unitCodes = []
    return res.modifiedCount || 0
  } catch (e) {
    console.error('❌ Lỗi trả tem về kho (non-fatal):', e.message)
    return 0
  }
}
