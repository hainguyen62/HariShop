import { colorPriceOf, colorImageOf, hasColorPrices } from '../utils/colorPricing.js'
import { computeFlashSale, attachFlashSale } from '../utils/flashSale.js'
import { buildCartItem, currentPriceOf, reconcileCart } from '../utils/cartItems.js'
import { findPriceMismatches } from '../utils/checkoutValidation.js'
import Product from '../models/productModel.js'

const hour = 3600 * 1000
const phone = {
  _id: 'p1',
  name: 'iPhone 18 Pro Max',
  price: 51999000,
  image: '/main.jpg',
  weight: 240,
  colors: [
    { name: 'Đỏ Burgundy', countInStock: 3, price: 51999000, image: '/red.jpg' },
    { name: 'Băng Thanh', countInStock: 2, price: 53999000, image: '/blue.jpg' },
    { name: 'Đen', countInStock: 1 },
  ],
}
const sale = { isActive: true, discountPercent: 10, startsAt: new Date(Date.now() - hour), endsAt: new Date(Date.now() + hour) }

describe('giá và ảnh theo màu', () => {
  it('lấy giá riêng của màu, màu chưa có giá thì dùng giá chung', () => {
    expect(colorPriceOf(phone, 'Băng Thanh')).toBe(53999000)
    expect(colorPriceOf(phone, 'Đen')).toBe(51999000)
    expect(colorPriceOf(phone, 'Mặc định')).toBe(51999000)
  })

  it('lấy ảnh của màu, thiếu thì dùng ảnh chính', () => {
    expect(colorImageOf(phone, 'Băng Thanh')).toBe('/blue.jpg')
    expect(colorImageOf(phone, 'Đen')).toBe('/main.jpg')
    expect(colorImageOf(phone, 'Không có')).toBe('/main.jpg')
  })

  it('nhận biết sản phẩm có giá khác nhau giữa các màu', () => {
    expect(hasColorPrices(phone)).toBe(true)
    expect(hasColorPrices({ ...phone, colors: [{ name: 'A', price: 5 }, { name: 'B', price: 5 }] , price: 5 })).toBe(false)
    expect(hasColorPrices({ price: 5 })).toBe(false)
  })

  it('flash sale giảm theo giá của từng màu', () => {
    const p = { ...phone, flashSale: sale }
    expect(computeFlashSale(p, 'Băng Thanh').salePrice).toBe(Math.round(53999000 * 0.9))
    expect(computeFlashSale(p, 'Đỏ Burgundy').salePrice).toBe(Math.round(51999000 * 0.9))
    expect(computeFlashSale(p).salePrice).toBe(Math.round(51999000 * 0.9))
    expect(attachFlashSale(p).hasColorPrices).toBe(true)
  })
})

describe('giỏ hàng theo màu', () => {
  it('dòng giỏ lấy giá và ảnh của màu đã chọn', () => {
    const item = buildCartItem(phone, 'Băng Thanh', 1)
    expect(item.price).toBe(53999000)
    expect(item.image).toBe('/blue.jpg')
    expect(item.originalPrice).toBeNull()
  })

  it('đang flash sale thì giá bán là giá sau giảm, giá gốc là giá của màu', () => {
    const item = buildCartItem({ ...phone, flashSale: sale }, 'Băng Thanh', 1)
    expect(item.price).toBe(Math.round(53999000 * 0.9))
    expect(item.originalPrice).toBe(53999000)
    expect(currentPriceOf({ ...phone, flashSale: sale }, 'Đỏ Burgundy')).toBe(Math.round(51999000 * 0.9))
  })

  it('làm mới giỏ báo đổi giá theo đúng màu', () => {
    const { kept, changes } = reconcileCart([{ product: 'p1', color: 'Băng Thanh', qty: 1, price: 51999000 }], { p1: phone })
    expect(kept[0].price).toBe(53999000)
    expect(changes).toEqual([{ type: 'price', name: phone.name, oldPrice: 51999000, newPrice: 53999000 }])
  })
})

describe('kiểm tra giá khi đặt hàng', () => {
  const item = (color, price) => ({ product: 'p1', name: phone.name, color, price })

  it('khớp khi đúng giá của màu', () => {
    expect(findPriceMismatches([item('Băng Thanh', 53999000)], { p1: phone })).toEqual([])
  })

  it('chặn khi khách gửi giá màu rẻ cho màu đắt', () => {
    const r = findPriceMismatches([item('Băng Thanh', 51999000)], { p1: phone })
    expect(r).toHaveLength(1)
    expect(r[0].newPrice).toBe(53999000)
  })

  it('sản phẩm không có màu vẫn dùng giá chung', () => {
    const plain = { _id: 'p2', price: 1000 }
    expect(findPriceMismatches([{ product: 'p2', name: 'x', color: 'Mặc định', price: 1000 }], { p2: plain })).toEqual([])
  })
})

describe('giá chung tự lấy giá thấp nhất khi lưu sản phẩm', () => {
  const runPreSave = async (doc) => {
    await Product.schema.s.hooks.execPre('save', doc, [])
    return doc
  }

  it('điền giá chung vào màu chưa có giá và lấy giá thấp nhất làm giá chung', async () => {
    const doc = await runPreSave(new Product({
      name: 'X', price: 60000000,
      colors: [{ name: 'Đỏ', countInStock: 2, price: 52000000 }, { name: 'Xanh', countInStock: 1 }],
    }))
    expect(doc.colors.map((c) => c.price)).toEqual([52000000, 60000000])
    expect(doc.price).toBe(52000000)
    expect(doc.countInStock).toBe(3)
  })

  it('sản phẩm không có màu giữ nguyên giá', async () => {
    const doc = await runPreSave(new Product({ name: 'Y', price: 1234, countInStock: 4 }))
    expect(doc.price).toBe(1234)
  })
})
