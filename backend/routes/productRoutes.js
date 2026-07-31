import express from 'express'
const router = express.Router()

import {
  getProducts,
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

router.route('/').get(getProducts).post(protect, admin, createProduct)
router.get('/top', getTopProducts)
router.get('/suggest', getSearchSuggestions)
router.post('/nl-search', naturalLanguageSearch)
router.get('/personalized', protect, getPersonalizedProducts)

router.route('/:id/reviews').post(protect, createProductReview)
router.route('/:id/reviews/:reviewId').delete(protect, admin, deleteProductReview)
router.get('/:id/related', getRelatedProducts)
router.get('/:id/review-summary', getReviewSummary)

router
  .route('/:id')
  .get(getProductById)
  .delete(protect, admin, deleteProduct)
  .put(protect, admin, updateProduct)

export default router