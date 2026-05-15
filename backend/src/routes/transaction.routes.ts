import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { list, create, update, bulkCreate, remove, summary } from '../controllers/transaction.controller'

const router = Router()

router.use(authMiddleware)

const auth = (handler: (req: AuthRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response) => handler(req as AuthRequest, res)

router.get('/',        auth(list))
router.get('/summary', auth(summary))
router.post('/',       auth(create))
router.post('/bulk',   auth(bulkCreate))
router.put('/:id',     auth(update))
router.delete('/:id',  auth(remove))

export default router