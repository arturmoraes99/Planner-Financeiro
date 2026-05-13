import { Router, Request, Response } from 'express'
import { register, login, me }  from '../controllers/auth.controller'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()

router.post('/register', (req: Request, res: Response) => register(req, res))
router.post('/login',    (req: Request, res: Response) => login(req, res))
router.get('/me',        authMiddleware, (req: Request, res: Response) => me(req as AuthRequest, res))

export default router