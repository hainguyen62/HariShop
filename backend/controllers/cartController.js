import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Cart from '../models/cartModel.js'
import Product from '../models/productModel.js'
import {
  MAX_CART_LINES, DEFAULT_COLOR, buildCartItem, validateLine, reconcileCart, findLine, removeLine, currentPriceOf,
} from '../utils/cartItems.js'

const getOrCreateCart = async (userId) => {
  const existing = await Cart.findOne({ user: userId })
  if (existing) return existing
  try {
    return await Cart.create({ user: userId, items: [] })
  } catch (e) {
    // Hai request tạo giỏ cùng lúc: bản còn lại đã tạo xong
    if (e.code === 11000) return Cart.findOne({ user: userId })
    throw e
  }
}

const loadProducts = async (items) => {
  const ids = [...new Set(items.map((i) => String(i.product)))]
  const products = await Product.find({ _id: { $in: ids } }).lean()
  const map = {}
  products.forEach((p) => { map[String(p._id)] = p })
  return map
}

// Đối chiếu giỏ với sản phẩm hiện tại, lưu lại và trả về dạng hiển thị
const respondWithCart = async (res, cart, { reconcile = true } = {}) => {
  const productMap = await loadProducts(cart.items)
  let changes = []
  if (reconcile) {
    const result = reconcileCart(cart.items, productMap)
    changes = result.changes
    const before = JSON.stringify(cart.items.map((i) => [String(i.product), i.color, i.qty, i.price]))
    const after = JSON.stringify(result.kept.map((i) => [String(i.product), i.color, i.qty, i.price]))
    if (before !== after) {
      cart.items = result.kept
      await cart.save()
    }
  }
  const items = cart.items
    .map((i) => (productMap[String(i.product)] ? buildCartItem(productMap[String(i.product)], i.color, i.qty) : null))
    .filter(Boolean)
  res.json({ items, changes })
}

// @desc    Lấy giỏ hàng của tài khoản (đã đối chiếu giá và tồn kho)
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id)
  await respondWithCart(res, cart)
})

// @desc    Đặt số lượng cho một dòng (thêm mới hoặc thay số lượng)
// @route   PUT /api/cart/item
// @access  Private
const setCartItem = asyncHandler(async (req, res) => {
  const { product: productId } = req.body
  const qty = Number(req.body.qty)
  const color = String(req.body.color || DEFAULT_COLOR)
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400)
    throw new Error('Sản phẩm không hợp lệ.')
  }
  const product = await Product.findById(productId).lean()
  const error = validateLine(product, color, qty)
  if (error) {
    res.status(error === 'Sản phẩm không tồn tại.' ? 404 : 400)
    throw new Error(error)
  }
  const cart = await getOrCreateCart(req.user._id)
  const line = findLine(cart.items, productId, color)
  if (line) {
    line.qty = qty
    line.price = currentPriceOf(product)
  } else {
    if (cart.items.length >= MAX_CART_LINES) {
      res.status(400)
      throw new Error(`Giỏ hàng tối đa ${MAX_CART_LINES} sản phẩm.`)
    }
    cart.items.push({ product: productId, color, qty, price: currentPriceOf(product) })
  }
  await cart.save()
  await respondWithCart(res, cart, { reconcile: false })
})

// @desc    Xóa một dòng khỏi giỏ
// @route   POST /api/cart/remove
// @access  Private
const removeCartItem = asyncHandler(async (req, res) => {
  const { product, color } = req.body
  const cart = await getOrCreateCart(req.user._id)
  cart.items = removeLine(cart.items, product, String(color || ''))
  await cart.save()
  await respondWithCart(res, cart, { reconcile: false })
})

// @desc    Xóa các dòng đã đặt hàng
// @route   POST /api/cart/remove-purchased
// @access  Private
const removePurchased = asyncHandler(async (req, res) => {
  const list = Array.isArray(req.body.items) ? req.body.items : []
  const cart = await getOrCreateCart(req.user._id)
  for (const it of list) cart.items = removeLine(cart.items, it.product, String(it.color || ''))
  await cart.save()
  await respondWithCart(res, cart, { reconcile: false })
})

// @desc    Xóa toàn bộ giỏ
// @route   POST /api/cart/clear
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id)
  cart.items = []
  await cart.save()
  res.json({ items: [], changes: [] })
})

export { getCart, setCartItem, removeCartItem, removePurchased, clearCart }
