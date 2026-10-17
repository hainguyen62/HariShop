import mongoose from 'mongoose'

const lineSchema = mongoose.Schema(
  {
    color:      { type: String, default: '' },
    systemQty:  { type: Number, required: true },
    countedQty: { type: Number, required: true },
    diff:       { type: Number, required: true },
  },
  { _id: false }
)

const stockCountSchema = mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    lines:       { type: [lineSchema], default: [] },
    totalDiff:   { type: Number, default: 0 },
    // true: tồn kho đã được chỉnh theo số đếm; false: chỉ ghi nhận chênh lệch
    adjusted:    { type: Boolean, default: false },
    note:        { type: String, default: '' },
    countedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    countedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
)

stockCountSchema.index({ countedAt: -1 })
stockCountSchema.index({ product: 1, countedAt: -1 })

const StockCount = mongoose.model('StockCount', stockCountSchema)
export default StockCount
