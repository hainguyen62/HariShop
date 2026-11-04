import express from 'express'
const router = express.Router()

import {
  getProducts,
  getFilterOptions,
  getProductById,
  deleteProduct,
  createProduct,
  updateProduct,
  createProductReview,
  getTopProducts,
  deleteProductReview,
  getRelatedProducts,
  getPersonalizedProducts,
  getReviewSummary,
} from '../controllers/productController.js'
import { naturalLanguageSearch } from '../controllers/searchController.js'
import { getSearchSuggestions } from '../controllers/searchSuggestController.js'

import { protect, admin } from '../middleware/authMiddleware.js'
import { cacheResponse } from '../middleware/cacheMiddleware.js'

router.route('/').get(cacheResponse(30), getProducts).post(protect, admin, createProduct)
router.get('/top', cacheResponse(60), getTopProducts)
router.get('/filter-options', cacheResponse(60), getFilterOptions)
router.get('/suggest', cacheResponse(30), getSearchSuggestions)
router.post('/nl-search', naturalLanguageSearch)
router.get('/personalized', protect, getPersonalizedProducts)

router.route('/:id/reviews').post(protect, createProductReview)
router.route('/:id/reviews/:reviewId').delete(protect, admin, deleteProductReview)
router.get('/:id/related', cacheResponse(60), getRelatedProducts)
router.get('/:id/review-summary', getReviewSummary)

router
  .route('/:id')
  .get(cacheResponse(15), getProductById)
  .delete(protect, admin, deleteProduct)
  .put(protect, admin, updateProduct)

export default router