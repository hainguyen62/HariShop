import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  createSession, getSessions, getSession, scanUnit, undoScan, closeSession,
} from '../controllers/countSessionController.js'

const router = express.Router()

router.route('/').get(protect, admin, getSessions).post(protect, admin, createSession)
router.route('/:id').get(protect, admin, getSession)
router.post('/:id/scan', protect, admin, scanUnit)
router.delete('/:id/scan/:code', protect, admin, undoScan)
router.post('/:id/close', protect, admin, closeSession)

export default router
