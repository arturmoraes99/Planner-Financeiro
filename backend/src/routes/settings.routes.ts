import { Router } from 'express'
import { SettingsController } from '../controllers/SettingsController'
import { authMiddleware }     from '../middlewares/auth.middleware'

const router = Router()
const ctrl   = new SettingsController()

router.use(authMiddleware)

router.get('/profile',     (req, res) => ctrl.getProfile(req, res))
router.put('/profile',     (req, res) => ctrl.updateProfile(req, res))
router.put('/password',    (req, res) => ctrl.changePassword(req, res))
router.get('/preferences', (req, res) => ctrl.getPreferences(req, res))
router.put('/preferences', (req, res) => ctrl.updatePreferences(req, res))
router.delete('/account',  (req, res) => ctrl.deleteAccount(req, res))
router.get('/export',      (req, res) => ctrl.exportData(req, res))

export default router