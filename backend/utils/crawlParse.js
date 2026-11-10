const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim()

const DONG = '[₫đ]'

export const parsePrice = (text) => {
  const m = String(text || '').match(/\d{1,3}(?:\.\d{3})+/)
  return m ? Number(m[0].replace(/\./g, '')) : 0
}

const BRAND_RULES = [
  [/^iphone|^ipad/i, 'Apple'],
  [/^(samsung|galaxy)/i, 'Samsung'],
  [/^(xiaomi|redmi|poco)/i, 'Xiaomi'],
  [/^oppo/i, 'OPPO'],
  [/^realme/i, 'Realme'],
  [/^vivo/i, 'Vivo'],
  [/^honor/i, 'Honor'],
  [/^(google|pixel)/i, 'Google'],
  [/^(nokia|hmd)/i, 'Nokia'],
  [/^(tecno|infinix|itel)/i, 'Tecno'],
  [/^(asus|rog)/i, 'ASUS'],
  [/^(nubia|redmagic|zte)/i, 'Nubia'],
  [/^(motorola|moto)/i, 'Motorola'],
  [/^oneplus/i, 'OnePlus'],
]

export const guessBrand = (name) => {
  const n = squash(name)
  const rule = BRAND_RULES.find(([re]) => re.test(n))
  return rule ? rule[1] : ''
}

// Bỏ phần quảng cáo đứng sau tên máy trong tiêu đề trang
export const cleanName = (title) =>
  squash(String(title || '').split(/\s*[|]\s*/)[0].replace(/\s+(giá|chính hãng|trả góp|giảm).*$/i, '').replace(/\s+-\s+.*$/, ''))

const SPEC_RULES = [
  ['ram', /dung luong ram|^ram$/],
  ['storage', /bo nho trong|dung luong luu tru/],
  ['battery', /dung luong pin|^pin/],
  ['screenSize', /kich thuoc man hinh/],
  ['screenType', /cong nghe man hinh/],
  ['camera', /camera sau/],
  ['cameraFront', /camera truoc/],
  ['chip', /^chipset$|^chip$/],
  ['os', /he dieu hanh/],
  ['sim', /the sim|^sim$/],
  ['connectivity', /ho tro mang|ket noi/],
  ['weight', /trong luong/],
]

// Rút chuỗi camera dài thành dạng "48MP + 12MP", không có số MP thì cắt ngắn
export const simplifyCamera = (value) => {
  const mp = [...String(value || '').matchAll(/(\d+(?:[.,]\d+)?)\s*MP/gi)].map((m) => `${m[1]}MP`)
  const unique = [...new Set(mp)]
  return unique.length ? unique.join(' + ') : squash(value).slice(0, 80)
}

// pairs: [[nhãn, giá trị], ...] lấy từ bảng thông số
export const mapSpecs = (pairs) => {
  const specs = { ram: '', storage: '', battery: 0, screenSize: '', screenType: '', camera: '', cameraFront: '', chip: '', os: '', sim: '', connectivity: '' }
  let weight = 0
  for (const [rawLabel, rawValue] of pairs || []) {
    const label = strip(rawLabel)
    const value = squash(rawValue)
    if (!label || !value) continue
    const rule = SPEC_RULES.find(([, re]) => re.test(label))
    if (!rule) continue
    const key = rule[0]
    if (key === 'battery') {
      const n = value.match(/(\d[\d.]*)\s*mah/i)
      if (n && !specs.battery) specs.battery = Number(n[1].replace(/\./g, ''))
    } else if (key === 'weight') {
      const n = value.match(/(\d+(?:[.,]\d+)?)\s*g\b/i)
      if (n && !weight) weight = Math.round(Number(n[1].replace(',', '.')))
    } else if (!specs[key]) {
      specs[key] = key === 'camera' || key === 'cameraFront' ? simplifyCamera(value) : value
    }
  }
  return { specs, weight }
}

const STORAGE_ONLY = /^\d+\s*(gb|tb)$/i

// Tìm các dòng dạng "Titan Đen 37.990.000₫" trong danh sách văn bản, bỏ các dòng chỉ là dung lượng
// Nhãn có giá nhưng không phải màu: giá cho bạn, điểm benchmark, phiên bản dung lượng
// Giá dưới mức này là tiền đặt cọc hoặc phụ kiện kèm, không phải giá máy
const MIN_PHONE_PRICE = 1000000
const NOT_COLOR = /:|^giá|antutu|benchmark|điểm|\d\s*(gb|tb)\b|trả góp|thu cũ|ưu đãi|cọc|đặt trước/i

export const parseColorLines = (lines) => {
  const seen = new Map()
  for (const line of lines || []) {
    const text = squash(line)
    if (text.length > 80) continue
    const m = text.match(new RegExp(`^(\\D.*?)\\s*(\\d{1,3}(?:\\.\\d{3})+)\\s*${DONG}`))
    if (!m) continue
    const name = squash(m[1].replace(/flash sale|giảm.*$/i, '').replace(/^màu sắc\s*:?\s*/i, ''))
    if (!name || STORAGE_ONLY.test(name) || NOT_COLOR.test(name) || name.length > 30) continue
    const price = parsePrice(m[2])
    if (price < MIN_PHONE_PRICE) continue
    if (!seen.has(name)) seen.set(name, price)
  }
  return [...seen].map(([name, price]) => ({ name, price }))
}

// Quy tắc đơn giản của robots.txt: nhóm User-agent: *, khớp tiền tố dài nhất, Allow thắng khi bằng nhau
export const parseRobots = (text) => {
  const rules = []
  let applies = false
  let inGroupHeader = false
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const key = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()
    if (key === 'user-agent') {
      if (!inGroupHeader) applies = false
      if (value === '*') applies = true
      inGroupHeader = true
    } else {
      inGroupHeader = false
      if (applies && (key === 'disallow' || key === 'allow') && value) rules.push({ allow: key === 'allow', path: value })
    }
  }
  return rules
}

export const isAllowedByRobots = (rules, path) => {
  let best = null
  for (const r of rules) {
    const prefix = r.path.replace(/\*.*$/, '').replace(/\$$/, '')
    if (!path.startsWith(prefix)) continue
    if (!best || prefix.length > best.len || (prefix.length === best.len && r.allow)) best = { len: prefix.length, allow: r.allow }
  }
  return best ? best.allow : true
}

// Mô tả ngắn viết từ thông số, không sao chép văn bản của trang nguồn
export const describeFromSpecs = (name, s) => {
  const parts = []
  if (s.chip) parts.push(`chip ${s.chip}`)
  if (s.ram) parts.push(`RAM ${s.ram}`)
  if (s.storage) parts.push(`bộ nhớ trong ${s.storage}`)
  if (s.screenSize) parts.push(`màn hình ${s.screenSize}${s.screenType ? ` ${s.screenType}` : ''}`)
  if (s.camera) parts.push(`camera sau ${s.camera}`)
  if (s.battery) parts.push(`pin ${s.battery} mAh`)
  return parts.length ? `${name} trang bị ${parts.join(', ')}.` : `${name}, hàng chính hãng.`
}

const NON_PHONE = /cu-dep|cu-tray|cu-xuoc|xuoc-can|doi-bao-hanh|-cu$|-cu-|op-lung|cuong-luc|sac-|cap-|tai-nghe|may-tinh|laptop|tablet|phu-kien|^mobile/

// Link trang chi tiết điện thoại mới: nằm ở gốc, dạng /ten-may.html, tên có chữ số, loại trừ máy cũ và phụ kiện
export const isProductUrl = (href, base = 'https://cellphones.com.vn') => {
  try {
    const u = new URL(href, base)
    if (!/^(www\.)?cellphones\.com\.vn$/.test(u.hostname)) return ''
    const m = u.pathname.match(/^\/([a-z0-9-]+)\.html$/)
    if (!m || !/\d/.test(m[1]) || NON_PHONE.test(m[1])) return ''
    return `${u.origin}${u.pathname}`
  } catch (e) {
    return ''
  }
}

// Màu hiển thị đoán từ tên màu, cụm dài đặt trước để khớp đúng
const HEX_BY_WORD = [
  ['titan sa mạc', '#c2a27c'], ['titan tự nhiên', '#b8afa3'], ['titan đen', '#3a3a3c'], ['titan trắng', '#e8e8ea'],
  ['xanh dương', '#3b82f6'], ['xanh lá', '#22c55e'], ['xanh ngọc', '#14b8a6'], ['xanh mint', '#7dd3b0'], ['xanh', '#3b82f6'],
  ['đen', '#1c1c1e'], ['trắng', '#f5f5f7'], ['bạc', '#c0c0c0'], ['xám', '#8e8e93'], ['đỏ', '#dc2626'],
  ['hồng', '#f472b6'], ['tím', '#a855f7'], ['vàng', '#e6c34a'], ['cam', '#f97316'], ['nâu', '#8b5a2b'], ['kem', '#f3e9d2'],
]

export const guessHex = (name) => {
  const n = String(name || '').toLowerCase()
  const hit = HEX_BY_WORD.find(([word]) => n.includes(word))
  return hit ? hit[1] : '#888888'
}
