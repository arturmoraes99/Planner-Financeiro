import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { list, create, addContribution, remove } from '../controllers/goal.controller'

const router = Router()

router.use(authMiddleware)

const auth = (handler: (req: AuthRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response) => handler(req as AuthRequest, res)

router.get('/',                   auth(list))
router.post('/',                  auth(create))
router.patch('/:id/contribution', auth(addContribution))
router.delete('/:id',             auth(remove))

export default router