// Tổng hợp kết quả phiên quét. counts: Map "productId|color" -> số tem đã quét.
export const countKey = (productId, color) => `${String(productId)}|${color || ''}`

export const buildSessionRows = (products, counts, { includeUnscanned = false } = {}) => {
  const scanned = new Set()
  counts.forEach((_, key) => scanned.add(key.split('|')[0]))

  const rows = []
  for (const p of products) {
    const id = String(p._id)
    if (!includeUnscanned && !scanned.has(id)) continue

    const hasColors = Array.isArray(p.colors) && p.colors.length > 0
    const make = (color, stock) => {
      const systemQty = Number(stock) || 0
      const countedQty = counts.get(countKey(id, color)) || 0
      return { color, systemQty, countedQty, diff: countedQty - systemQty }
    }
    const lines = hasColors ? p.colors.map((c) => make(c.name, c.countInStock)) : [make('', p.countInStock)]
    rows.push({
      productId: id,
      name: p.name,
      productCode: p.productCode || '',
      lines,
      totalCounted: lines.reduce((s, l) => s + l.countedQty, 0),
      totalSystem: lines.reduce((s, l) => s + l.systemQty, 0),
      totalDiff: lines.reduce((s, l) => s + l.diff, 0),
    })
  }
  return rows
}
