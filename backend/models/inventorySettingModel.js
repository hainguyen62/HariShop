import mongoose from 'mongoose'

// Cấu hình kho dùng chung: ngưỡng tồn lâu, thời gian chờ hàng, số ngày muốn đủ hàng
const inventorySettingSchema = mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'inventory' },
    agingThresholdDays: { type: Number, default: 60, min: 1 },
    leadTimeDays: { type: Number, default: 7, min: 1 },
    coverDays: { type: Number, default: 30, min: 1 },
  },
  { timestamps: true }
)

const InventorySetting = mongoose.model('InventorySetting', inventorySettingSchema)

export const getInventorySettings = async () =>
  InventorySetting.findOneAndUpdate({ key: 'inventory' }, { $setOnInsert: { key: 'inventory' } }, { new: true, upsert: true })

export default InventorySetting
