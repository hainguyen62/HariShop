import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import { generateUnits, getUnits, getUnitSummary, voidUnits } from '../controllers/unitController.js'

const router = express.Router()

router.post('/generate', protect, admin, generateUnits)
router.put('/void', protect, admin, voidUnits)
router.get('/product/:id', protect, admin, getUnitSummary)
router.get('/', protect, admin, getUnits)

export default router
