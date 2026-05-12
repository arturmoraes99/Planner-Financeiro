import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { listBudgets, upsertBudget, removeBudget } from '../controllers/budget.controller'

const router = Router()

router.use(authMiddleware)

router.get('/',       listBudgets)
router.post('/',      upsertBudget)
router.delete('/:id', removeBudget)

export default router
