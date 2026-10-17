import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  getImportProducts,
  getLastImportCost,
  createStockImport,
  getStockImports,
  deleteStockImport,
} from '../controllers/importController.js'
import { exportImportsExcel } from '../controllers/exportController.js'

const router = express.Router()

router.route('/').get(protect, admin, getStockImports).post(protect, admin, createStockImport)
router.get('/products', protect, admin, getImportProducts)
router.get('/last-cost', protect, admin, getLastImportCost)
router.get('/export/excel', protect, admin, exportImportsExcel)
router.route('/:id').delete(protect, admin, deleteStockImport)

export default router
