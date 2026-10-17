// Đọc cookie từ header, không cần thư viện ngoài
export const parseCookies = (header = '') => {
  const out = {}
  String(header).split(';').forEach((part) => {
    const i = part.indexOf('=')
    if (i < 0) return
    const k = part.slice(0, i).trim()
    if (!k) return
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim())
    } catch {
      out[k] = part.slice(i + 1).trim()
    }
  })
  return out
}
