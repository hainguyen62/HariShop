// Ghép số đếm thực tế với tồn trên hệ thống. Trả { error } hoặc { lines, totalDiff }.
export const buildCountLines = (product, inputLines) => {
  if (!Array.isArray(inputLines) || inputLines.length === 0) {
    return { error: 'Chưa có số đếm nào' }
  }
  const hasColors = Array.isArray(product.colors) && product.colors.length > 0
  const seen = new Set()
  const lines = []

  for (const raw of inputLines) {
    const counted = Number(raw?.countedQty)
    if (!Number.isInteger(counted) || counted < 0) {
      return { error: 'Số đếm phải là số nguyên không âm' }
    }
    let color = ''
    let systemQty
    if (hasColors) {
      const found = product.colors.find((c) => c.name === raw?.color)
      if (!found) return { error: `Sản phẩm không có màu "${raw?.color || ''}"` }
      color = found.name
      systemQty = Number(found.countInStock) || 0
    } else {
      systemQty = Number(product.countInStock) || 0
    }
    if (seen.has(color)) return { error: 'Mỗi màu chỉ được nhập số đếm một lần' }
    seen.add(color)
    lines.push({ color, systemQty, countedQty: counted, diff: counted - systemQty })
  }

  const totalDiff = lines.reduce((sum, l) => sum + l.diff, 0)
  return { lines, totalDiff }
}
