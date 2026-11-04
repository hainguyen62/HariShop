import { colorPriceOf, hasColorPrices } from './colorPricing.js'

// Flash sale được tính tại thời điểm đọc theo giờ hiện tại, hết hạn thì giá tự về giá gốc

// Tính giá sau giảm cho sản phẩm, hoặc cho một màu nếu truyền color
export const computeFlashSale = (product, color) => {
  const fs = product.flashSale

  if (!fs || !fs.isActive || !fs.discountPercent || !fs.startsAt || !fs.endsAt) {
    return { isFlashSaleActive: false }
  }

  const now = new Date()
  const start = new Date(fs.startsAt)
  const end = new Date(fs.endsAt)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || now < start || now > end) {
    return { isFlashSaleActive: false }
  }

  const discountPercent = fs.discountPercent
  const basePrice = color === undefined ? product.price : colorPriceOf(product, color)
  const salePrice = Math.max(0, Math.round(basePrice * (1 - discountPercent / 100)))

  return {
    isFlashSaleActive: true,
    discountPercent,
    salePrice,
    flashSaleEndsAt: fs.endsAt,
  }
}

// Gắn thông tin flash sale và cờ giá khác nhau theo màu vào sản phẩm trước khi trả về frontend
export const attachFlashSale = (product) => ({
  ...product,
  ...computeFlashSale(product),
  hasColorPrices: hasColorPrices(product),
})

// Gắn cho cả mảng sản phẩm
export const attachFlashSaleToList = (products) => (products || []).map(attachFlashSale)

// ── Xác thực & chuẩn hoá dữ liệu Flash Sale Admin nhập vào (tạo/sửa sản phẩm) ──
export const normalizeFlashSale = (input) => {
  if (!input || typeof input !== 'object') {
    return { isActive: false, discountPercent: 0, startsAt: null, endsAt: null }
  }

  const discountPercent = Math.min(90, Math.max(0, Number(input.discountPercent) || 0))
  const startsAt = input.startsAt ? new Date(input.startsAt) : null
  const endsAt = input.endsAt ? new Date(input.endsAt) : null

  let isActive = !!input.isActive
  // Thiếu % giảm hoặc ngày không hợp lệ thì tự tắt để không lưu flash sale hỏng
  if (isActive) {
    const validDates = startsAt && endsAt && !Number.isNaN(startsAt.getTime()) && !Number.isNaN(endsAt.getTime())
    if (!validDates || endsAt <= startsAt || discountPercent <= 0) {
      isActive = false
    }
  }

  return { isActive, discountPercent, startsAt, endsAt }
}