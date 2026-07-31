// Logic thuần tính trạng thái bảo hành cho 1 sản phẩm trong đơn hàng.
// Tách riêng (không đụng DB) để viết unit test được, giống các util khác
// trong dự án (checkoutValidation.js, reportPeriod.js...).

const DAY_MS = 24 * 60 * 60 * 1000

// Cộng thêm N tháng vào 1 ngày — dùng Date built-in (tự xử lý tràn năm/tháng
// đúng theo lịch, VD 31/1 + 1 tháng = 28/2 hoặc 29/2 tuỳ năm nhuận).
function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

// Tính trạng thái bảo hành cho 1 orderItem, dựa trên trạng thái đơn hàng.
// Trả về: { status, warrantyStart, warrantyEnd, remainingDays }
//   status: 'cancelled' | 'not_started' | 'active' | 'expired'
export function computeWarrantyStatus(item, order, now = new Date()) {
  if (order.isCancelled) {
    return { status: 'cancelled', warrantyStart: null, warrantyEnd: null, remainingDays: null }
  }

  if (!order.isDelivered || !order.deliveredAt) {
    return { status: 'not_started', warrantyStart: null, warrantyEnd: null, remainingDays: null }
  }

  const warrantyStart = new Date(order.deliveredAt)
  const warrantyEnd = addMonths(warrantyStart, item.warrantyMonths ?? 12)
  const remainingDays = Math.ceil((warrantyEnd.getTime() - now.getTime()) / DAY_MS)

  return {
    status: remainingDays > 0 ? 'active' : 'expired',
    warrantyStart,
    warrantyEnd,
    remainingDays: Math.max(remainingDays, 0),
  }
}