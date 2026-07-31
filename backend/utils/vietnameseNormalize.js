// Chuẩn hóa chuỗi tiếng Việt để so sánh/tìm kiếm không phân biệt hoa-thường
// và không phân biệt dấu. Quan trọng: phép thay thế dấu được làm theo kiểu
// "1 ký tự → 1 ký tự" (không rút gọn độ dài chuỗi), để vị trí ký tự trong
// chuỗi đã chuẩn hóa luôn khớp với vị trí trong chuỗi gốc — nhờ vậy frontend
// có thể tô đậm (highlight) đúng đoạn khớp trên chuỗi gốc (có dấu) dựa theo
// vị trí tìm được trên chuỗi đã chuẩn hóa.

const DIACRITIC_MAP = {
  à: 'a', á: 'a', ạ: 'a', ả: 'a', ã: 'a',
  â: 'a', ầ: 'a', ấ: 'a', ậ: 'a', ẩ: 'a', ẫ: 'a',
  ă: 'a', ằ: 'a', ắ: 'a', ặ: 'a', ẳ: 'a', ẵ: 'a',
  è: 'e', é: 'e', ẹ: 'e', ẻ: 'e', ẽ: 'e',
  ê: 'e', ề: 'e', ế: 'e', ệ: 'e', ể: 'e', ễ: 'e',
  ì: 'i', í: 'i', ị: 'i', ỉ: 'i', ĩ: 'i',
  ò: 'o', ó: 'o', ọ: 'o', ỏ: 'o', õ: 'o',
  ô: 'o', ồ: 'o', ố: 'o', ộ: 'o', ổ: 'o', ỗ: 'o',
  ơ: 'o', ờ: 'o', ớ: 'o', ợ: 'o', ở: 'o', ỡ: 'o',
  ù: 'u', ú: 'u', ụ: 'u', ủ: 'u', ũ: 'u',
  ư: 'u', ừ: 'u', ứ: 'u', ự: 'u', ử: 'u', ữ: 'u',
  ỳ: 'y', ý: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y',
  đ: 'd',
}

// Bản đồ chữ hoa tương ứng (giữ 1-1 để không đổi độ dài chuỗi)
const DIACRITIC_MAP_UPPER = Object.fromEntries(
  Object.entries(DIACRITIC_MAP).map(([k, v]) => [k.toUpperCase(), v.toUpperCase()])
)

const FULL_MAP = { ...DIACRITIC_MAP, ...DIACRITIC_MAP_UPPER }

/**
 * Bỏ dấu tiếng Việt, giữ nguyên độ dài chuỗi (1 ký tự → 1 ký tự).
 */
export const stripDiacritics = (str) => {
  if (!str) return ''
  return String(str)
    .split('')
    .map((ch) => FULL_MAP[ch] ?? ch)
    .join('')
}

/**
 * Chuẩn hóa đầy đủ để so sánh/tìm kiếm: bỏ dấu + viết thường.
 * Độ dài chuỗi được giữ nguyên (không collapse khoảng trắng ở đây) để
 * vị trí ký tự khớp 1-1 với chuỗi gốc, phục vụ highlight chính xác.
 */
export const normalizeForSearch = (str) => {
  if (!str) return ''
  return stripDiacritics(String(str)).toLowerCase()
}

/**
 * Chuẩn hóa để LƯU/so khớp từ khóa lịch sử (gộp khoảng trắng thừa, trim).
 * Dùng khi độ dài không cần khớp 1-1 với bản gốc (vd so sánh 2 từ khóa).
 */
export const normalizeKeyword = (str) => {
  if (!str) return ''
  return normalizeForSearch(str).trim().replace(/\s+/g, ' ')
}

// Thoát ký tự đặc biệt trước khi đưa vào RegExp
export const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default { stripDiacritics, normalizeForSearch, normalizeKeyword, escapeRegex }