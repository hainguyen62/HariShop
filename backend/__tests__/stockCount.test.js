import { buildCountLines } from '../utils/stockCount.js'

const withColors = {
  countInStock: 9,
  colors: [{ name: 'Đen', countInStock: 5 }, { name: 'Trắng', countInStock: 4 }],
}

describe('buildCountLines', () => {
  it('tính chênh lệch theo từng màu', () => {
    const r = buildCountLines(withColors, [{ color: 'Đen', countedQty: 4 }, { color: 'Trắng', countedQty: 6 }])
    expect(r.lines).toEqual([
      { color: 'Đen', systemQty: 5, countedQty: 4, diff: -1 },
      { color: 'Trắng', systemQty: 4, countedQty: 6, diff: 2 },
    ])
    expect(r.totalDiff).toBe(1)
  })
  it('sản phẩm không có màu dùng tồn tổng', () => {
    const r = buildCountLines({ countInStock: 7 }, [{ countedQty: 7 }])
    expect(r.lines[0]).toEqual({ color: '', systemQty: 7, countedQty: 7, diff: 0 })
    expect(r.totalDiff).toBe(0)
  })
  it('từ chối dữ liệu sai', () => {
    expect(buildCountLines(withColors, []).error).toBeTruthy()
    expect(buildCountLines(withColors, [{ color: 'Đỏ', countedQty: 1 }]).error).toMatch(/không có màu/)
    expect(buildCountLines(withColors, [{ color: 'Đen', countedQty: -1 }]).error).toBeTruthy()
    expect(buildCountLines(withColors, [{ color: 'Đen', countedQty: 1.5 }]).error).toBeTruthy()
    expect(buildCountLines(withColors, [{ color: 'Đen', countedQty: 1 }, { color: 'Đen', countedQty: 2 }]).error).toBeTruthy()
  })
})
