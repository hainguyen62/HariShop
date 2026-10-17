import mongoose from 'mongoose'

// Bộ đếm theo khoá (VD: order-251005), tăng nguyên tử bằng $inc
const counterSchema = mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
})

const Counter = mongoose.model('Counter', counterSchema)
export default Counter
