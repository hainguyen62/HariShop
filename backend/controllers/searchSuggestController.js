import asyncHandler from 'express-async-handler'
import Product from '../models/productModel.js'
import { normalizeForSearch, normalizeKeyword, escapeRegex } from '../utils/vietnameseNormalize.js'

const SUGGEST_LIMIT = 8
const BRAND_LIMIT = 4
const CATEGORY_LIMIT = 3

// ═══════════════════ Gợi ý tìm kiếm theo thời gian thực (Autocomplete) ═══════════════════
// GET /api/products/suggest?q=...
// Trả về gợi ý được nhóm theo loại (brand / category / product), không phân
// biệt hoa-thường và không phân biệt dấu (so khớp trên field *Normalized đã
// được tính sẵn — xem productModel.js). Chỉ trả về các trường cần thiết cho
// dropdown để giữ response nhẹ (đúng yêu cầu tối ưu hiệu năng).
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const rawQuery = String(req.query.q || '').trim()

  if (!rawQuery) {
    return res.json({ brands: [], categories: [], products: [], hasResults: false })
  }

  const q = normalizeKeyword(rawQuery)
  const qRegexSafe = escapeRegex(q)
  const startRegex = new RegExp('^' + qRegexSafe, 'i')
  const containRegex = new RegExp(qRegexSafe, 'i')

  // ── Thương hiệu khớp (distinct, ưu tiên bắt đầu bằng từ khóa) ──
  const allBrands = await Product.distinct('brand', { brandNormalized: containRegex })
  const brands = allBrands
    .map((b) => ({ name: b, normalized: normalizeForSearch(b) }))
    .sort((a, b) => {
      const aStarts = startRegex.test(a.normalized) ? 0 : 1
      const bStarts = startRegex.test(b.normalized) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return a.normalized.localeCompare(b.normalized)
    })
    .slice(0, BRAND_LIMIT)
    .map((b) => b.name)

  // ── Danh mục khớp (distinct) ──
  const allCategories = await Product.distinct('category', {
    $or: [{ nameNormalized: containRegex }, { category: containRegex }],
  })
  const normalizedCategoryMatches = allCategories.filter((c) =>
    containRegex.test(normalizeForSearch(c))
  )
  const categories = normalizedCategoryMatches.slice(0, CATEGORY_LIMIT)

  // ── Sản phẩm khớp — lấy dư một chút để sắp xếp độ ưu tiên phía server ──
  const products = await Product.find(
    { nameNormalized: containRegex },
    '_id name brand image price rating numReviews nameNormalized'
  )
    .limit(SUGGEST_LIMIT * 3)
    .lean()

  const rank = (p) => {
    const n = p.nameNormalized
    if (n === q) return 0 // khớp hoàn toàn
    if (startRegex.test(n)) return 1 // bắt đầu bằng từ khóa
    return 2 // chứa từ khóa ở giữa
  }

  const rankedProducts = products
    .sort((a, b) => {
      const r = rank(a) - rank(b)
      if (r !== 0) return r
      // cùng hạng: ưu tiên bán chạy/đánh giá cao hơn, rồi tới sản phẩm mới hơn
      if ((b.numReviews || 0) !== (a.numReviews || 0)) return (b.numReviews || 0) - (a.numReviews || 0)
      return (b.rating || 0) - (a.rating || 0)
    })
    .slice(0, SUGGEST_LIMIT)
    .map(({ nameNormalized, ...rest }) => rest)

  const hasResults = brands.length > 0 || categories.length > 0 || rankedProducts.length > 0

  res.json({
    brands,
    categories,
    products: rankedProducts,
    hasResults,
  })
})

export { getSearchSuggestions }