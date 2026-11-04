const findColor = (product, color) =>
  Array.isArray(product?.colors) ? product.colors.find((c) => c.name === color) : undefined

export const colorPriceOf = (product, color) => {
  const own = Number(findColor(product, color)?.price)
  return own > 0 ? own : Number(product?.price) || 0
}

export const colorImageOf = (product, color) => findColor(product, color)?.image || product?.image || ''

export const hasColorPrices = (product) => {
  if (!Array.isArray(product?.colors) || product.colors.length < 2) return false
  return new Set(product.colors.map((c) => colorPriceOf(product, c.name))).size > 1
}
