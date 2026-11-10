const KEY = 'hs_after_login'
const MAX_AGE_MS = 10 * 60 * 1000

// Chỉ nhận đường dẫn nội bộ, tránh chuyển hướng sang trang lạ
export const safePath = (p) => {
  if (typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//') || p.includes('\\')) return ''
  return p
}

export const rememberRedirect = (p) => {
  const path = safePath(p)
  if (!path) return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }))
  } catch (e) {
    // trình duyệt chặn lưu trữ thì bỏ qua
  }
}

// Lấy đường dẫn đã lưu (còn hạn) rồi xóa ngay để chỉ dùng một lần
export const takeRedirect = () => {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    if (!raw) return ''
    const { path, at } = JSON.parse(raw)
    return Date.now() - at <= MAX_AGE_MS ? safePath(path) : ''
  } catch (e) {
    return ''
  }
}
