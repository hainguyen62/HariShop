import { escapeRegex } from './listQuery.js'
import { normalizeForSearch } from './vietnameseNormalize.js'

export const buildKeywordFilter = (keyword) => {
  const text = String(keyword || '').trim()
  if (!text) return {}
  const plain = new RegExp(escapeRegex(text), 'i')
  const unaccented = new RegExp(escapeRegex(normalizeForSearch(text)), 'i')
  return { $or: [{ name: plain }, { nameNormalized: unaccented }, { productCode: plain }] }
}
