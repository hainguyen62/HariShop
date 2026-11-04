export const colorStockTotal = (product) =>
  (product.colors || []).reduce((sum, c) => sum + (Number(c.countInStock) || 0), 0)

export const findTotalMismatches = (products) =>
  products
    .filter((p) => Array.isArray(p.colors) && p.colors.length > 0)
    .map((p) => ({ id: p._id, name: p.name, stored: Number(p.countInStock) || 0, expected: colorStockTotal(p) }))
    .filter((r) => r.stored !== r.expected)
