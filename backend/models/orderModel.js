import mongoose from 'mongoose'

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    orderItems: [
      {
        name:    { type: String, required: true },
        qty:     { type: Number, required: true },
        image:   { type: String, required: true },
        price:   { type: Number, required: true },
        weight:  { type: Number, default: 0 },
        // ── MỚI: lưu màu sắc khách đã chọn ──────────────────────
        color:   { type: String, default: '' },
        // Số tháng bảo hành chốt tại lúc mua
        warrantyMonths: { type: Number, default: 12 },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
      },
    ],

    shippingAddress: {
      fullName:      { type: String, required: true },
      phone:         { type: String, required: true },
      province:      { type: String, required: true },
      district:      { type: String, default: '' },
      ward:          { type: String, required: true },
      detail:        { type: String, required: true },
      ghnDistrictId: { type: Number, default: null },
      ghnWardCode:   { type: String, default: '' },
    },

    // Mã đơn dễ đọc: HSO-<mã SP>-<mã màu>-<STT theo SP và màu>-<ngày tạo YYMMDD>
    orderCode: { type: String, unique: true, sparse: true },
    legacyOrderCode: { type: String, index: true, sparse: true },
    // Mã tem các máy đã xuất kho cho đơn
    unitCodes: { type: [String], default: [] },
    // Đơn mới phải quét tem xuất kho trước khi giao cho đơn vị vận chuyển
    exportRequired: { type: Boolean, default: false },
    exportScans: [
      {
        _id: false,
        code:      { type: String, required: true },
        itemIndex: { type: Number, required: true },
        scannedAt: { type: Date, default: Date.now },
        scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    exportedAt: { type: Date },
    exportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    exportManualQty: { type: Number, default: 0 },

    paymentMethod:  { type: String, required: true },
    paymentResult: {
      id:           { type: String },
      status:       { type: String },
      update_time:  { type: String },
      email_address:{ type: String },
    },

    taxPrice:      { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice:    { type: Number, required: true, default: 0.0 },

    isPaid:    { type: Boolean, required: true, default: false },
    paidAt:    { type: Date },
    // Tổng tiền khách đã chuyển qua nhiều lần
    paymentReceivedAmount: { type: Number, default: 0 },
    // Mã giao dịch SePay đã ghi nhận, chống đếm trùng khi SePay gửi lại
    sepayTransactionIds: { type: [String], default: [] },
    // Admin chốt thu phần còn thiếu khi nhận hàng cho đơn online đã chuyển một phần
    partialCod:           { type: Boolean, default: false },
    codRemainderAmount:   { type: Number, default: 0 },
    partialCodAt:         { type: Date },
    // Hoàn tiền thừa: hệ thống đánh dấu pending, admin chuyển khoản tay rồi xác nhận completed
    overpaidAmount:       { type: Number, default: 0 },
    overpaidRefundStatus: { type: String, enum: ['none', 'pending', 'completed'], default: 'none' },
    overpaidRefundedAt:   { type: Date },
    overpaidRefundNote:   { type: String, default: '' },

    deliveryMethod:  { type: String, default: 'nhanh' },
    voucherCode:     { type: String, default: '' },
    // Voucher chốt tại lúc đặt, không đổi khi voucher gốc bị sửa hoặc xóa
    voucherId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    voucherName:     { type: String, default: '' },
    discountType:    { type: String, default: '' }, // 'percent' | 'fixed' | 'freeship'
    discountValue:   { type: Number, default: 0 },   // giá trị gốc của voucher (vd: 10 nếu percent 10%)
    shopMessage:     { type: String, default: '' },
    deliveryFee:     { type: Number, default: 0.0 },
    voucherDiscount: { type: Number, default: 0.0 },
    totalWeight:     { type: Number, default: 0.0 },
    itemsPrice:      { type: Number, required: true, default: 0.0 },

    isDelivered:  { type: Boolean, required: true, default: false },
    deliveredAt:  { type: Date },

    isCancelled:  { type: Boolean, default: false },
    cancelledAt:  { type: Date },
    cancelReason: { type: String, default: '' },
    // Chống hoàn kho hai lần cho cùng một đơn
    stockRestored: { type: Boolean, default: false },
    // Chống hoàn voucher hai lần
    voucherReverted: { type: Boolean, default: false },
    cancelRequest: {
      requested:   { type: Boolean, default: false },
      reason:      { type: String, default: '' },
      requestedAt: { type: Date },
    },

    shippingProvider:       { type: String, default: '' },
    shippingServiceCode:    { type: String, default: '' },
    shippingServiceName:    { type: String, default: '' },
    shippingEtaDate:        { type: Date },
    shippingTrackingId:     { type: String, default: '' },
    shippingTrackingEvents: [
      {
        status:      { type: String, default: '' },
        description: { type: String, default: '' },
        location:    { type: String, default: '' },
        time:        { type: Date },
      },
    ],

    ghnOrderCode:   { type: String, default: '' },
    ghnSortCode:    { type: String, default: '' },
    ghnTrackingUrl: { type: String, default: '' },

    // MỚI: mã vận đơn GHTK (gọi là "label") sau khi tạo đơn thật thành công
    ghtkLabelCode:  { type: String, default: '' },
    ghtkPartnerId:  { type: String, default: '' }, // mã đơn nội bộ gửi cho GHTK (HS-<orderId>)

    transferContent: { type: String, default: '' },

    // ── MỚI (A3): trạng thái đơn hàng chi tiết theo timeline ────────
    status: {
      type: String,
      enum: [
        'pending',           // 1. Đơn hàng đã được đặt thành công
        'confirmed',         // 2. Shop đã xác nhận và chuẩn bị hàng
        'packing',           // 3. Đã đóng gói, chờ shipper lấy
        'waiting_pickup',    // 4. Chờ đơn vị vận chuyển lấy hàng
        'picked_up',         // 5. GHN đã lấy hàng thành công
        'in_transit',        // 6. Đang vận chuyển đến kho trung gian
        'out_for_delivery',  // 7. Shipper đang giao hàng đến bạn
        'delivered',         // 8. Giao hàng thành công
        'delivery_failed',   // 9. Giao hàng không thành công
        'returning',         // 10. Hàng đang hoàn về kho
        'returned',          // 11. Hàng đã hoàn về kho
        'cancelled',         // 12. Đơn hàng đã bị hủy
      ],
      default: 'pending',
    },
    statusHistory: [
      {
        status:    { type: String, required: true },
        note:      { type: String, default: '' },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // ── MỚI (A5): Hoàn tiền khi giao hàng thất bại ──────────────────
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'completed', 'rejected'],
      default: 'none',
    },
    refundAmount:      { type: Number, default: 0 },
    refundAt:          { type: Date },
    refundNote:        { type: String, default: '' },      // ghi chú của Admin khi xử lý
    refundRequestedAt: { type: Date },
    refundReason:      { type: String, default: '' },      // lý do khách nêu khi yêu cầu
    refundBankInfo: {
      bankName:      { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
    },
    // MỚI: hoá đơn đã gửi qua email cho khách
    invoiceSentAt:    { type: Date },
    invoiceSentTo:    { type: String, default: '' },
    invoiceSentCount: { type: Number, default: 0 },
    // Ngân hàng khách cung cấp riêng cho khoản chuyển dư
    overpaidRefundBankInfo: {
      bankName:      { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
    },
    // MỚI: lịch sử điều chỉnh khi admin sửa lại số tiền hoàn đã xác nhận
    refundAdjustments: [
      {
        previousAmount: { type: Number, required: true },
        newAmount:      { type: Number, required: true },
        note:           { type: String, default: '' },
        adjustedAt:     { type: Date, default: Date.now },
        adjustedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
)

// Lịch sử đơn của khách, mới nhất trước
orderSchema.index({ user: 1, createdAt: -1 })
// Webhook SePay tra đơn theo mã chuyển khoản, chỉ index đơn đã có mã
orderSchema.index(
  { transferContent: 1 },
  { partialFilterExpression: { transferContent: { $ne: '' } } }
)
// Danh sách đơn ở admin và báo cáo theo ngày
orderSchema.index({ createdAt: -1 })
// Job tự hủy đơn online quá hạn chưa thanh toán
orderSchema.index({ paymentMethod: 1, isPaid: 1, createdAt: 1 })
// Tra đơn theo mã tem đã xuất kho
orderSchema.index({ unitCodes: 1 })

const Order = mongoose.model('Order', orderSchema)

export default Order