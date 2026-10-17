import mongoose from 'mongoose'

const stockImportSchema = mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    // Mã lô LO-<YYMMDD ngày nhập>-<STT>; nhiều phiếu nhập (nhiều sản phẩm) có thể chung một lô
    lotCode:     { type: String, index: true },
    color:       { type: String, default: '' },
    unitsGenerated: { type: Number, default: 0 }, // số tem đơn vị đã sinh cho phiếu này
    quantity:    { type: Number, required: true, min: 1 },
    unitCost:    { type: Number, required: true, min: 0 },
    totalCost:   { type: Number, required: true, min: 0 },
    supplier:    { type: String, default: '' },
    note:        { type: String, default: '' },
    importedAt:  { type: Date, default: Date.now },
    stockBefore: { type: Number, default: 0 },
    stockAfter:  { type: Number, default: 0 },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

stockImportSchema.index({ importedAt: -1 })
stockImportSchema.index({ product: 1, color: 1, importedAt: -1 })

const StockImport = mongoose.model('StockImport', stockImportSchema)
export default StockImport
