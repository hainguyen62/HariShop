export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const DAY = /^\d{4}-\d{2}-\d{2}$/

const parseDay = (value, endOfDay) => {
  if (!value || !DAY.test(String(value))) return null
  const d = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

// Khoảng ngày theo giờ Việt Nam, trả về null nếu không có đầu vào hợp lệ
export const dateRange = (from, to) => {
  const range = {}
  const s = parseDay(from, false)
  const e = parseDay(to, true)
  if (s) range.$gte = s
  if (e) range.$lte = e
  return Object.keys(range).length ? range : null
}

const toNum = (v) => {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const numRange = (min, max) => {
  const range = {}
  const lo = toNum(min)
  const hi = toNum(max)
  if (lo !== null) range.$gte = lo
  if (hi !== null) range.$lte = hi
  return Object.keys(range).length ? range : null
}

export const sortDirection = (order) => (order === 'asc' ? 1 : order === 'desc' ? -1 : null)

export const pageParams = (value, pageSize = 10) => {
  const page = Math.max(parseInt(value, 10) || 1, 1)
  return { page, pageSize, skip: pageSize * (page - 1) }
}

export const pagesOf = (total, pageSize) => Math.ceil(total / pageSize) || 1
