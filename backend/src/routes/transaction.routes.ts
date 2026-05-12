import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { list, create, update, bulkCreate, remove, summary } from '../controllers/transaction.controller'

const router = Router()

router.use(authMiddleware)

router.get('/',           list)
router.get('/summary',    summary)
router.post('/',          create)
router.post('/bulk',      bulkCreate)
router.put('/:id',        update)      // ← NOVO
router.delete('/:id',     remove)

export default router
