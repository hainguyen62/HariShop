export const MAX_IMPORT_QTY = 100000

export const validateImportInput = ({ quantity, unitCost, importedAt }) => {
  const qty = Number(quantity)
  const cost = Number(unitCost)
  if (!Number.isInteger(qty) || qty < 1) return 'Số lượng nhập phải là số nguyên lớn hơn 0'
  if (qty > MAX_IMPORT_QTY) return `Số lượng nhập tối đa ${MAX_IMPORT_QTY} mỗi phiếu`
  if (!Number.isFinite(cost) || cost < 0) return 'Giá nhập không hợp lệ'
  if (importedAt && Number.isNaN(new Date(importedAt).getTime())) return 'Ngày nhập không hợp lệ'
  return null
}

export const resolveStockTarget = (product, color) => {
  const hasColors = Array.isArray(product.colors) && product.colors.length > 0
  if (!hasColors) {
    return { hasColors: false, color: '', stockBefore: Number(product.countInStock) || 0 }
  }
  if (!color) return { error: 'Vui lòng chọn màu sắc cho sản phẩm này' }
  const target = product.colors.find((c) => c.name === color)
  if (!target) return { error: `Sản phẩm không có màu "${color}"` }
  return { hasColors: true, color: target.name, stockBefore: Number(target.countInStock) || 0 }
}

export const computeImportTotal = (quantity, unitCost) => Math.round(Number(quantity) * Number(unitCost))
