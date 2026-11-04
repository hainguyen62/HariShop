import { colorStockTotal, findTotalMismatches } from '../utils/stockTotals.js'

const withColors = (id, stored, ...stocks) => ({
  _id: id, name: `P${id}`, countInStock: stored, colors: stocks.map((n, i) => ({ name: `c${i}`, countInStock: n })),
})

describe('tồn kho chung theo màu', () => {
  it('cộng tồn kho các màu', () => {
    expect(colorStockTotal(withColors(1, 0, 3, 1))).toBe(4)
    expect(colorStockTotal({})).toBe(0)
  })

  it('chỉ báo các sản phẩm có màu mà số lưu khác tổng các màu', () => {
    const list = [withColors(1, 4, 3, 0), withColors(2, 5, 3, 2), { _id: 3, name: 'P3', countInStock: 9 }]
    expect(findTotalMismatches(list)).toEqual([{ id: 1, name: 'P1', stored: 4, expected: 3 }])
  })
})
