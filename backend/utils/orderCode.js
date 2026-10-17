import Counter from '../models/counterModel.js'

export const stripDiacritics = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')

// Mã ngắn của sản phẩm: 2 chữ đầu của hãng + mã model đầu tiên có số (VD: iPhone 15 Pro → IP15)
export const productShortCode = (name) => {
  const words = stripDiacritics(name)
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 'SP'
  const brand = words[0].slice(0, 2).toUpperCase()
  const model = words.slice(1).find((w) => /\d/.test(w))
  const tail = model ? model.slice(0, 3).toUpperCase() : (words[1] || '').slice(0, 1).toUpperCase()
  return `${brand}${tail}`
}

// Ngày theo giờ Việt Nam, dạng YYMMDD
export const dateStamp = (date = new Date()) => {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  const y = String(vn.getUTCFullYear()).slice(-2)
  const m = String(vn.getUTCMonth() + 1).padStart(2, '0')
  const d = String(vn.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

// Mã đơn cũ, chỉ còn dùng để nhận diện và đổi sang mã mới
export const formatLegacyOrderCode = (date, shortCode, seq) =>
  `HS-${dateStamp(date)}-${shortCode}-${String(seq).padStart(4, '0')}`

// HSO-<mã SP>-<mã màu>-<STT 5 số theo SP và màu>-<ngày tạo đơn YYMMDD>, ví dụ HSO-RE16-BLACK-00007-261009
export const ORDER_CODE_RE = /^HSO-[A-Z0-9]{2,8}(?:-\d{1,4})?-[A-Z][A-Z0-9]{0,15}-\d{5,}-\d{6}$/
export const LEGACY_ORDER_CODE_RE = /^HS-\d{6}-[A-Z0-9]{2,8}-\d{4,}$/

export const formatOrderCode = (productCode, colorCode, seq, date = new Date()) =>
  `HSO-${String(productCode).replace(/^HS-/, '')}-${colorCode}-${String(seq).padStart(5, '0')}-${dateStamp(date)}`

export const LOT_CODE_RE = /^LO-\d{6}-\d{4,}$/

export const formatLotCode = (date, seq) => `LO-${dateStamp(date)}-${String(seq).padStart(4, '0')}`

// Mã lô LO-<YYMMDD ngày nhập>-<STT trong ngày>, không gắn sản phẩm vì một lô có nhiều sản phẩm
export const nextLotCode = async (importedAt = new Date()) => {
  const stamp = dateStamp(importedAt)
  const counter = await Counter.findOneAndUpdate(
    { _id: `lot-${stamp}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return formatLotCode(importedAt, counter.seq)
}

// Sản phẩm đầu tiên của mã ngắn là HS-IP15, các sản phẩm trùng mã ngắn là HS-IP15-2, HS-IP15-3...
export const formatProductCode = (productName, seq) =>
  Number(seq) <= 1 ? `HS-${productShortCode(productName)}` : `HS-${productShortCode(productName)}-${seq}`

// Mã sản phẩm cấp một lần và không đổi; bộ đếm riêng theo mã SP để không trùng
export const nextProductCode = async (productName) => {
  const short = productShortCode(productName)
  const counter = await Counter.findOneAndUpdate(
    { _id: `product-${short}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return formatProductCode(productName, counter.seq)
}

// STT tăng nguyên tử theo từng sản phẩm và màu của mặt hàng đầu tiên, không lùi và không dùng lại
export const nextOrderCode = async (productCode, colorCode, date = new Date()) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: `ordseq-${productCode}-${colorCode}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return formatOrderCode(productCode, colorCode, counter.seq, date)
}
