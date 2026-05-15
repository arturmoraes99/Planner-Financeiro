import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { listBudgets, upsertBudget, removeBudget } from '../controllers/budget.controller'

const router = Router()

router.use(authMiddleware)

const auth = (handler: (req: AuthRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response) => handler(req as AuthRequest, res)

router.get('/',       auth(listBudgets))
router.post('/',      auth(upsertBudget))
router.delete('/:id', auth(removeBudget))

export default router