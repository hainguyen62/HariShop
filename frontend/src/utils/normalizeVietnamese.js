// Bản sao phía frontend của utils/vietnameseNormalize.js ở backend — dùng để
// tô đậm (highlight) đúng đoạn chữ khớp trên chuỗi GỐC (có dấu) dựa theo vị
// trí tìm được trên chuỗi đã chuẩn hóa (không dấu). Phép thay thế giữ
// nguyên độ dài chuỗi (1 ký tự → 1 ký tự) nên vị trí luôn khớp 1-1.

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

const DIACRITIC_MAP_UPPER = Object.fromEntries(
  Object.entries(DIACRITIC_MAP).map(([k, v]) => [k.toUpperCase(), v.toUpperCase()])
)

const FULL_MAP = { ...DIACRITIC_MAP, ...DIACRITIC_MAP_UPPER }

export const stripDiacritics = (str) => {
  if (!str) return ''
  return String(str)
    .split('')
    .map((ch) => FULL_MAP[ch] ?? ch)
    .join('')
}

export const normalizeForSearch = (str) => {
  if (!str) return ''
  return stripDiacritics(String(str)).toLowerCase()
}

/**
 * Tìm vị trí đoạn khớp của `query` (đã chuẩn hóa) trong `original` (chuỗi
 * gốc có dấu), trả về { before, match, after } để component render phần
 * in đậm. Trả về null nếu không khớp.
 */
export const findHighlightSegments = (original, query) => {
  if (!query) return null
  const normOriginal = normalizeForSearch(original)
  const normQuery = normalizeForSearch(query).trim()
  if (!normQuery) return null

  const idx = normOriginal.indexOf(normQuery)
  if (idx === -1) return null

  return {
    before: original.slice(0, idx),
    match: original.slice(idx, idx + normQuery.length),
    after: original.slice(idx + normQuery.length),
  }
}

export default { stripDiacritics, normalizeForSearch, findHighlightSegments }