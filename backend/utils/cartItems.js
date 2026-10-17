import { computeFlashSale } from './flashSale.js'

export const MAX_CART_LINES = 100
export const DEFAULT_COLOR = 'Mặc định'

const sameLine = (a, product, color) => String(a.product) === String(product) && (a.color || '') === (color || '')

// Tồn kho theo màu; sản phẩm không có màu thì lấy tổng
export const stockForColor = (product, color) => {
  if (Array.isArray(product.colors) && product.colors.length > 0) {
    const c = product.colors.find((x) => x.name === color)
    return c ? Number(c.countInStock) || 0 : null
  }
  return Number(product.countInStock) || 0
}

export const currentPriceOf = (product) => {
  const fs = computeFlashSale(product)
  return fs.isFlashSaleActive ? fs.salePrice : product.price
}

// Dòng giỏ hàng đầy đủ thông tin hiển thị, cùng dạng frontend đang dùng
export const buildCartItem = (product, color, qty) => {
  const fs = computeFlashSale(product)
  const stock = stockForColor(product, color)
  return {
    product: String(product._id),
    name: product.name,
    image: product.image,
    price: fs.isFlashSaleActive ? fs.salePrice : product.price,
    countInStock: stock === null ? 0 : stock,
    weight: product.weight,
    qty,
    color,
    isFlashSaleActive: !!fs.isFlashSaleActive,
    flashSaleEndsAt: fs.isFlashSaleActive ? fs.flashSaleEndsAt : null,
    discountPercent: fs.isFlashSaleActive ? fs.discountPercent : null,
    originalPrice: fs.isFlashSaleActive ? product.price : null,
  }
}

// Kiểm tra một lần thêm hoặc sửa; trả về thông báo lỗi hoặc null
export const validateLine = (product, color, qty) => {
  if (!product) return 'Sản phẩm không tồn tại.'
  if (!Number.isInteger(qty) || qty < 1) return 'Số lượng không hợp lệ.'
  const stock = stockForColor(product, color)
  if (stock === null) return `Sản phẩm không có màu "${color}".`
  if (stock < 1) return 'Sản phẩm này hiện đã hết hàng.'
  if (qty > stock) return `Chỉ còn ${stock} sản phẩm trong kho.`
  return null
}

// Làm mới giỏ theo dữ liệu sản phẩm hiện tại: bỏ món không còn, cắt qty theo tồn, báo đổi giá
export const reconcileCart = (items, productMap) => {
  const kept = []
  const changes = []
  for (const it of items) {
    const p = productMap[String(it.product)]
    if (!p) {
      changes.push({ type: 'removed', name: '' })
      continue
    }
    const stock = stockForColor(p, it.color)
    const price = currentPriceOf(p)
    let qty = it.qty
    if (stock !== null && stock >= 1 && qty > stock) {
      qty = stock
      changes.push({ type: 'stock', name: p.name, qty })
    }
    if (it.price && it.price !== price) {
      changes.push({ type: 'price', name: p.name, oldPrice: it.price, newPrice: price })
    }
    kept.push({ product: it.product, color: it.color, qty, price })
  }
  return { kept, changes }
}

export const findLine = (items, product, color) => items.find((x) => sameLine(x, product, color))
export const removeLine = (items, product, color) => items.filter((x) => !sameLine(x, product, color))
