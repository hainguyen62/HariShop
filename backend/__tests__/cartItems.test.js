import { stockForColor, buildCartItem, validateLine, reconcileCart, findLine, removeLine } from '../utils/cartItems.js'

const phone = {
  _id: 'p1', name: 'iPhone 15', image: '/a.png', price: 1000, weight: 200, countInStock: 9,
  colors: [{ name: 'Đen', countInStock: 3 }, { name: 'Trắng', countInStock: 0 }],
}
const plain = { _id: 'p2', name: 'Cáp', image: '/c.png', price: 50, weight: 10, countInStock: 5, colors: [] }

describe('stockForColor', () => {
  it('lấy tồn theo màu, null nếu màu không tồn tại', () => {
    expect(stockForColor(phone, 'Đen')).toBe(3)
    expect(stockForColor(phone, 'Xanh')).toBeNull()
    expect(stockForColor(plain, 'Mặc định')).toBe(5)
  })
})

describe('validateLine', () => {
  it('chặn số lượng vượt tồn, hết hàng, màu sai', () => {
    expect(validateLine(phone, 'Đen', 3)).toBeNull()
    expect(validateLine(phone, 'Đen', 4)).toMatch(/Chỉ còn 3/)
    expect(validateLine(phone, 'Trắng', 1)).toMatch(/hết hàng/)
    expect(validateLine(phone, 'Xanh', 1)).toMatch(/không có màu/)
    expect(validateLine(phone, 'Đen', 0)).toMatch(/không hợp lệ/)
    expect(validateLine(phone, 'Đen', 1.5)).toMatch(/không hợp lệ/)
    expect(validateLine(null, 'Đen', 1)).toMatch(/không tồn tại/)
  })
})

describe('buildCartItem', () => {
  it('trả về dạng frontend đang dùng', () => {
    const it = buildCartItem(phone, 'Đen', 2)
    expect(it).toMatchObject({ product: 'p1', name: 'iPhone 15', price: 1000, countInStock: 3, qty: 2, color: 'Đen', isFlashSaleActive: false })
  })
})

describe('reconcileCart', () => {
  it('bỏ món không còn, cắt qty theo tồn, báo đổi giá', () => {
    const items = [
      { product: 'p1', color: 'Đen', qty: 5, price: 900 },
      { product: 'p2', color: 'Mặc định', qty: 1, price: 50 },
      { product: 'gone', color: '', qty: 1, price: 10 },
    ]
    const { kept, changes } = reconcileCart(items, { p1: phone, p2: plain })
    expect(kept).toHaveLength(2)
    expect(kept[0]).toMatchObject({ qty: 3, price: 1000 })
    expect(changes.map((c) => c.type).sort()).toEqual(['price', 'removed', 'stock'])
  })
})

describe('findLine và removeLine', () => {
  it('cùng sản phẩm khác màu là hai dòng', () => {
    const items = [{ product: 'p1', color: 'Đen', qty: 1 }, { product: 'p1', color: 'Trắng', qty: 1 }]
    expect(findLine(items, 'p1', 'Trắng').color).toBe('Trắng')
    expect(removeLine(items, 'p1', 'Đen')).toHaveLength(1)
  })
})
