const KEY = 'hs_pending_action'
const MAX_AGE_MS = 10 * 60 * 1000

// Lưu thao tác đang dở trước khi chuyển sang đăng nhập (màu, số lượng, loại thao tác)
export const savePendingAction = ({ type, productId, qty, color }) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ type, productId: String(productId), qty: Number(qty) || 1, color: color || '', at: Date.now() }))
  } catch (e) {
    // trình duyệt chặn lưu trữ thì bỏ qua
  }
}

// Chỉ trả về khi đúng sản phẩm và còn hạn, dùng một lần
export const takePendingAction = (productId) => {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const fresh = Date.now() - data.at <= MAX_AGE_MS
    if (!fresh) {
      sessionStorage.removeItem(KEY)
      return null
    }
    if (data.productId !== String(productId)) return null
    sessionStorage.removeItem(KEY)
    return data
  } catch (e) {
    return null
  }
}
