import mongoose from 'mongoose'

const countSessionSchema = mongoose.Schema(
  {
    name:      { type: String, required: true },
    status:    { type: String, enum: ['open', 'closed'], default: 'open' },
    note:      { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedAt:  { type: Date },
    // Kết quả chốt phiên, lưu lại để xem về sau
    result:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
)

countSessionSchema.index({ createdAt: -1 })

export const CountSession = mongoose.model('CountSession', countSessionSchema)

const scanSchema = mongoose.Schema(
  {
    session:     { type: mongoose.Schema.Types.ObjectId, ref: 'CountSession', required: true },
    code:        { type: String, required: true },
    product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, default: '' },
    color:       { type: String, default: '' },
    scannedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scannedAt:   { type: Date, default: Date.now },
  },
  { timestamps: false }
)

// Một tem chỉ được quét một lần trong mỗi phiên
scanSchema.index({ session: 1, code: 1 }, { unique: true })
scanSchema.index({ session: 1, scannedAt: -1 })

export const CountScan = mongoose.model('CountScan', scanSchema)
