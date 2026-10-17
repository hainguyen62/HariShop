import Counter from '../models/counterModel.js'
import { stripDiacritics, dateStamp } from './orderCode.js'

export const MAX_UNITS_PER_IMPORT = 5000
export const MAX_UNITS_PER_GENERATE = 500

// HS-<mã SP>[-n]-<mã màu>-<STT 5 số>-<ngày nhập YYMMDD>, ví dụ HS-OPX9-WHITE-00007-261005
export const UNIT_CODE_RE = /HS-[A-Z0-9]{2,8}(?:-\d{1,4})?-[A-Z][A-Z0-9]{0,15}-\d{5}-\d{6}/

// Từ điển màu tiếng Việt (không dấu) sang tiếng Anh; cụm dài được thử trước
const COLOR_WORDS = {
  'xanh la cay': 'GREEN', 'xanh duong': 'BLUE', 'xanh la': 'GREEN', 'xanh ngoc': 'TEAL', 'xanh den': 'DARKBLUE',
  'xanh navy': 'NAVY', 'xanh mint': 'MINT', 'vang dong': 'GOLD', 'vang kim': 'GOLD', 'tu nhien': 'NATURAL',
  'sa mac': 'DESERT', trang: 'WHITE', den: 'BLACK', do: 'RED', xanh: 'BLUE', vang: 'YELLOW', hong: 'PINK',
  tim: 'PURPLE', cam: 'ORANGE', xam: 'GRAY', bac: 'SILVER', nau: 'BROWN', kem: 'CREAM',
}
const MAX_COLOR_CODE = 16

// Mã màu tiếng Anh viết liền, ví dụ Trắng thành WHITE; từ không có trong từ điển giữ nguyên không dấu
export const colorCodeOf = (name) => {
  const tokens = stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return 'NC'
  const parts = []
  for (let i = 0; i < tokens.length; ) {
    let matched = false
    for (let len = Math.min(3, tokens.length - i); len >= 1; len -= 1) {
      const phrase = tokens.slice(i, i + len).join(' ')
      if (COLOR_WORDS[phrase]) {
        parts.push(COLOR_WORDS[phrase])
        i += len
        matched = true
        break
      }
    }
    if (!matched) {
      parts.push(tokens[i].toUpperCase())
      i += 1
    }
  }
  let code = parts.join('').slice(0, MAX_COLOR_CODE)
  if (!/^[A-Z]/.test(code)) code = `C${code}`.slice(0, MAX_COLOR_CODE)
  return code
}

// Mã màu của cả sản phẩm; hai màu ra cùng mã thì màu sau thêm số (XD, XD2)
export const colorCodesFor = (colorNames) => {
  const result = new Map()
  const used = new Map()
  for (const name of colorNames) {
    const base = colorCodeOf(name)
    const n = (used.get(base) || 0) + 1
    used.set(base, n)
    result.set(name, n === 1 ? base : `${base}${n}`)
  }
  return result
}

export const colorCodeFor = (product, color) => {
  const colors = Array.isArray(product.colors) ? product.colors.map((c) => c.name) : []
  if (!color || colors.length === 0) return 'NC'
  return colorCodesFor(colors).get(color) || colorCodeOf(color)
}

export const formatUnitCode = (productCode, colorCode, seq, date = new Date()) =>
  `${productCode}-${colorCode}-${String(seq).padStart(5, '0')}-${dateStamp(date)}`

// Lấy mã tem từ chuỗi quét được (mã trần, hoặc đường dẫn chứa mã)
export const parseUnitCode = (text) => {
  const m = String(text || '').toUpperCase().match(UNIT_CODE_RE)
  return m ? m[0] : null
}

// Cấp n số thứ tự liên tiếp cho một sản phẩm và màu, trả về mảng mã
export const allocateUnitCodes = async (productCode, colorCode, n, date = new Date()) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: `unit-${productCode}-${colorCode}` },
    { $inc: { seq: n } },
    { new: true, upsert: true }
  )
  const start = counter.seq - n + 1
  return Array.from({ length: n }, (_, i) => formatUnitCode(productCode, colorCode, start + i, date))
}
