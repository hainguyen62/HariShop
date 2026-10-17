import mongoose from 'mongoose'

// Mỗi bản ghi là một refresh token; chỉ lưu bản băm, không lưu chuỗi gốc
const refreshTokenSchema = mongoose.Schema(
  {
    user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash:       { type: String, required: true, unique: true },
    family:          { type: String, required: true, index: true },
    expiresAt:       { type: Date, required: true },
    absoluteExpires: { type: Date, required: true },
    revokedAt:       { type: Date },
    userAgent:       { type: String, default: '' },
  },
  { timestamps: true }
)

// Mongo tự xóa bản ghi sau khi quá hạn trượt
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)
export default RefreshToken
