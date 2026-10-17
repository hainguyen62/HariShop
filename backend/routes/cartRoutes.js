import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { getCart, setCartItem, removeCartItem, removePurchased, clearCart } from '../controllers/cartController.js'

const router = express.Router()

router.get('/', protect, getCart)
router.put('/item', protect, setCartItem)
router.post('/remove', protect, removeCartItem)
router.post('/remove-purchased', protect, removePurchased)
router.post('/clear', protect, clearCart)

export default router
