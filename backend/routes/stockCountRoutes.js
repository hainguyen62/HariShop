import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import { getCountProduct, createStockCount, getStockCounts } from '../controllers/stockCountController.js'

const router = express.Router()

router.route('/').get(protect, admin, getStockCounts).post(protect, admin, createStockCount)
router.get('/product/:id', protect, admin, getCountProduct)

export default router
