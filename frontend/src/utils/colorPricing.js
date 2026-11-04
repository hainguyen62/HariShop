export const colorPriceOf = (product, color) => {
  const own = Number(product?.colors?.find((c) => c.name === color)?.price)
  return own > 0 ? own : Number(product?.price) || 0
}

export const unitPriceOf = (product, color) => {
  const base = colorPriceOf(product, color)
  const discount = Number(product?.discountPercent) || 0
  const sale = product?.isFlashSaleActive && discount > 0 ? Math.max(0, Math.round(base * (1 - discount / 100))) : null
  return { base, sale }
}
