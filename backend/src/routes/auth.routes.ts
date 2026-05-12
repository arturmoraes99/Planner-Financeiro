import { Router } from 'express'
import { register, login, me } from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.post('/register', register)
router.post('/login',    login)
router.get('/me',        authMiddleware as any, me as any)

export default router
