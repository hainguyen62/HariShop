import { computeFlashSale } from './flashSale.js'
import { colorPriceOf } from './colorPricing.js'

// Kiểm tra các trường bắt buộc, trả { valid: true } hoặc { valid: false, status, message }
export function validateOrderInput({ orderItems, shippingAddress, paymentMethod }) {
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    return { valid: false, status: 400, message: 'No order items' }
  }
  if (!shippingAddress) {
    return { valid: false, status: 400, message: 'Shipping address required' }
  }

  const addr = shippingAddress
  if (!addr.fullName?.trim())  return { valid: false, status: 400, message: 'Full name required' }
  if (!addr.phone?.trim())     return { valid: false, status: 400, message: 'Phone number required' }
  if (!addr.province?.trim())  return { valid: false, status: 400, message: 'Province required' }
  if (!addr.ward?.trim())      return { valid: false, status: 400, message: 'Ward required' }
  if (!addr.detail?.trim())    return { valid: false, status: 400, message: 'Address detail required' }
  if (!paymentMethod?.trim())  return { valid: false, status: 400, message: 'Payment method required' }

  return { valid: true }
}

// So giá trong DB (theo đúng màu) với giá khách gửi, trả danh sách sản phẩm lệch giá
export function findPriceMismatches(orderItems, productMap) {
  const mismatches = []

  for (const item of orderItems) {
    const p = productMap[item.product?.toString()]
    if (!p) continue // sản phẩm không còn tồn tại — controller tự xử lý riêng nếu cần

    const { isFlashSaleActive, salePrice } = computeFlashSale(p, item.color)
    const currentPrice = isFlashSaleActive ? salePrice : colorPriceOf(p, item.color)

    if (currentPrice !== item.price) {
      mismatches.push({ name: item.name, oldPrice: item.price, newPrice: currentPrice })
    }
  }

  return mismatches
}

// Tổng khối lượng: dùng số frontend gửi nếu > 0, không thì tự tính từ orderItems
export function computeTotalWeight(orderItems, frontendTotalWeight) {
  const computed = Array.isArray(orderItems)
    ? orderItems.reduce((sum, item) => sum + (item.weight || 0) * (item.qty || 0), 0)
    : 0

  return frontendTotalWeight > 0 ? Number(frontendTotalWeight) : computed
}

// Số giảm giá frontend gửi phải khớp số backend tự tính, lệch tối đa 1đ
export function voucherDiscountMatches(submittedDiscount, expectedDiscount) {
  return Math.abs(Number(submittedDiscount || 0) - expectedDiscount) <= 1
}