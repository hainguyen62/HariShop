import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import { getAgingStock, getSettings, updateSettings, setProductThreshold } from '../controllers/inventoryController.js'

const router = express.Router()

router.get('/aging', protect, admin, getAgingStock)
router.put('/aging/:productId', protect, admin, setProductThreshold)
router.route('/settings').get(protect, admin, getSettings).put(protect, admin, updateSettings)

export default router
