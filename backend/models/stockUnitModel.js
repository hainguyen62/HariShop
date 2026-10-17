import mongoose from 'mongoose'

// Mỗi bản ghi là một chiếc máy có tem QR riêng
const stockUnitSchema = mongoose.Schema(
  {
    code:          { type: String, required: true, unique: true },
    product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode:   { type: String, required: true },
    color:         { type: String, default: '' },
    colorCode:     { type: String, default: '' },
    lotCode:       { type: String, default: '' },
    importRecord:  { type: mongoose.Schema.Types.ObjectId, ref: 'StockImport' },
    // in_stock: còn trong kho, sold: đã bán, void: hủy hoặc hỏng, mã không đổi
    status:        { type: String, enum: ['in_stock', 'sold', 'void'], default: 'in_stock' },
    soldOrder:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    soldAt:        { type: Date },
    note:          { type: String, default: '' },
    voidReason:    { type: String, default: '' },
  },
  { timestamps: true }
)

stockUnitSchema.index({ product: 1, color: 1, status: 1 })
stockUnitSchema.index({ lotCode: 1 })

const StockUnit = mongoose.model('StockUnit', stockUnitSchema)
export default StockUnit
