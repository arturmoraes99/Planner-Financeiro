import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
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

router.use(authMiddleware)

const auth = (handler: (req: AuthRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response) => handler(req as AuthRequest, res)

// Cartões
router.get('/',    auth(listCards))
router.post('/',   auth(createCard))
router.put('/:id', auth(updateCard))
router.delete('/:id', auth(deleteCard))

// Lançamentos no cartão
router.post('/:cardId/transactions', auth(addCardTransaction))

// Faturas
router.get('/:cardId/invoices',              auth(listInvoices))
router.get('/:cardId/invoices/:month',       auth(getInvoiceByMonth))
router.patch('/:cardId/invoices/:month/pay', auth(payInvoice))

export default router