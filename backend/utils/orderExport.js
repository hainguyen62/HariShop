// Quy tắc xuất kho bằng quét tem: thuần tính toán, không truy cập cơ sở dữ liệu

// Sản phẩm không có màu: giỏ hàng ghi "Mặc định" nhưng tem lưu màu rỗng
export const unitColorOf = (item, hasColors) => (hasColors.get(String(item.product)) ? item.color || '' : '')

export const availKey = (productId, color) => `${productId}|${color || ''}`

// Mỗi dòng hàng cần quét bao nhiêu tem: tối đa bằng số lượng, và không quá số tem còn trong kho
export const planLines = ({ orderItems, scans, available, hasColors }) => {
  const pool = new Map(available)
  return (orderItems || []).map((item, index) => {
    const color = unitColorOf(item, hasColors)
    const key = availKey(item.product, color)
    const needScan = Math.min(item.qty, pool.get(key) || 0)
    pool.set(key, (pool.get(key) || 0) - needScan)
    const scanned = (scans || []).filter((s) => s.itemIndex === index).length
    return { index, name: item.name, color: item.color || '', qty: item.qty, scanned, needScan, manual: item.qty - needScan, done: scanned >= needScan }
  })
}

// Kiểm tra một tem quét vào đơn, trả về dòng hàng nhận tem hoặc lý do từ chối
export const checkScan = ({ unit, orderItems, scans, hasColors }) => {
  if (!unit) return { ok: false, error: 'Không tìm thấy tem này trong hệ thống' }
  if (unit.status === 'sold') return { ok: false, error: 'Tem này đã bán cho đơn khác' }
  if (unit.status !== 'in_stock') return { ok: false, error: 'Tem này đã bị hủy, không xuất kho được' }
  if ((scans || []).some((s) => s.code === unit.code)) return { ok: false, error: 'Tem này đã quét cho đơn này rồi' }
  const matches = []
  ;(orderItems || []).forEach((item, index) => {
    if (String(item.product) === String(unit.product) && unitColorOf(item, hasColors) === (unit.color || '')) matches.push(index)
  })
  if (matches.length === 0) return { ok: false, error: 'Tem này không thuộc sản phẩm và màu nào trong đơn' }
  const target = matches.find((i) => (scans || []).filter((s) => s.itemIndex === i).length < orderItems[i].qty)
  if (target === undefined) return { ok: false, error: 'Đã quét đủ số lượng cho sản phẩm này' }
  return { ok: true, itemIndex: target }
}

export const EXPORT_STATUSES = ['confirmed', 'packing']
export const EXPORT_GATED_STATUSES = ['waiting_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered']
