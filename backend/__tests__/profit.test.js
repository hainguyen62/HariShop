import { computeProfit } from '../utils/reportData.js'

describe('computeProfit', () => {
  it('lợi nhuận = doanh thu - chi phí nhập, biên tính theo doanh thu', () => {
    expect(computeProfit(100000000, 60000000)).toEqual({ profit: 40000000, margin: 40 })
  })
  it('lỗ khi chi phí nhập lớn hơn doanh thu', () => {
    expect(computeProfit(50000000, 80000000)).toEqual({ profit: -30000000, margin: -60 })
  })
  it('doanh thu bằng 0 thì không có biên lợi nhuận', () => {
    expect(computeProfit(0, 5000000)).toEqual({ profit: -5000000, margin: null })
  })
  it('chịu được giá trị rỗng', () => {
    expect(computeProfit(undefined, undefined)).toEqual({ profit: 0, margin: null })
  })
  it('làm tròn biên 1 chữ số thập phân', () => {
    expect(computeProfit(3, 1).margin).toBe(66.7)
  })
})
