import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import {
  listCards,
  createCard,
  updateCard,
  deleteCard,
  addCardTransaction,
  listInvoices,
  getInvoiceByMonth,
  payInvoice,
} from '../controllers/card.controller'

const router = Router()

router.use(authMiddleware as any)

// Cartões
router.get('/',          listCards         as any)
router.post('/',         createCard        as any)
router.put('/:id',       updateCard        as any)
router.delete('/:id',    deleteCard        as any)

// Lançamentos no cartão
router.post('/:cardId/transactions', addCardTransaction as any)

// Faturas
router.get('/:cardId/invoices',              listInvoices      as any)
router.get('/:cardId/invoices/:month',       getInvoiceByMonth as any)
router.patch('/:cardId/invoices/:month/pay', payInvoice        as any)

export default router
