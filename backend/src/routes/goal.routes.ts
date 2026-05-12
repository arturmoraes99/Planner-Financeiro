import { Router } from 'express'
import { list, create, addContribution, remove } from '../controllers/goal.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware as any)

router.get('/',                    list            as any)
router.post('/',                   create          as any)
router.patch('/:id/contribution',  addContribution as any)
router.delete('/:id',              remove          as any)

export default router
