import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import { getForecastOverview, getProductForecast, getForecastAdvice } from '../controllers/forecastController.js'

const router = express.Router()

router.get('/overview', protect, admin, getForecastOverview)
router.get('/product/:id', protect, admin, getProductForecast)
router.post('/advice', protect, admin, getForecastAdvice)

export default router
