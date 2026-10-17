import mongoose from 'mongoose'

// Giỏ hàng gắn với tài khoản; price là giá lúc thêm hoặc lần đồng bộ gần nhất để báo khi giá đổi
const cartItemSchema = mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    color:   { type: String, default: '' },
    qty:     { type: Number, required: true, min: 1 },
    price:   { type: Number, default: 0 },
  },
  { _id: false }
)

const cartSchema = mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
)

const Cart = mongoose.model('Cart', cartSchema)
export default Cart
