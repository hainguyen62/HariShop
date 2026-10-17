const DAY = 24 * 60 * 60 * 1000

// Tuổi tồn theo nguyên tắc nhập trước bán trước: hàng còn lại thuộc các lô nhập mới nhất.
// Trả về ngày của lô cũ nhất còn hàng. Phần tồn không có phiếu nhập (hàng có từ trước khi dùng chức năng nhập)
// được tính từ fallbackDate (thường là ngày tạo sản phẩm).
export const oldestStockDate = ({ stock, imports, fallbackDate }) => {
  if (!(stock > 0)) return { date: null, basedOn: 'none' }
  let remaining = stock
  let oldest = null
  let oldestLot = ''
  const sorted = [...(imports || [])].sort((a, b) => new Date(b.date) - new Date(a.date))
  for (const lot of sorted) {
    if (remaining <= 0) break
    remaining -= Math.min(Number(lot.qty) || 0, remaining)
    oldest = lot.date
    oldestLot = lot.lotCode || ''
  }
  if (remaining > 0) return { date: fallbackDate || null, basedOn: 'created', lotCode: '' }
  return { date: oldest, basedOn: 'import', lotCode: oldestLot }
}

export const ageInDays = (date, now = new Date()) => {
  if (!date) return null
  return Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / DAY))
}

export const effectiveThreshold = (productThreshold, globalThreshold) =>
  Number(productThreshold) > 0 ? Number(productThreshold) : Number(globalThreshold)

export const buildAgingRow = ({ product, imports, lastSaleAt, globalThreshold, now = new Date() }) => {
  const stock = product.countInStock || 0
  const { date, basedOn, lotCode } = oldestStockDate({ stock, imports, fallbackDate: product.createdAt })
  const ageDays = ageInDays(date, now)
  const threshold = effectiveThreshold(product.agingThresholdDays, globalThreshold)
  const over = ageDays !== null && ageDays > threshold
  return {
    productId: String(product._id),
    name: product.name,
    brand: product.brand,
    stock,
    oldestDate: date,
    oldestLot: lotCode,
    basedOn,
    ageDays,
    threshold,
    customThreshold: Number(product.agingThresholdDays) || 0,
    over,
    overBy: over ? ageDays - threshold : 0,
    lastSaleAt: lastSaleAt || null,
    daysSinceSale: lastSaleAt ? ageInDays(lastSaleAt, now) : null,
    alertedAt: product.agingAlertedAt || null,
  }
}
