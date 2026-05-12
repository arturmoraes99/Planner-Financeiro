import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const settingsController = new SettingsController();

router.use(authMiddleware);

router.get('/profile', settingsController.getProfile);
router.put('/profile', settingsController.updateProfile);
router.put('/password', settingsController.changePassword);
router.get('/preferences', settingsController.getPreferences);
router.put('/preferences', settingsController.updatePreferences);
router.delete('/account', settingsController.deleteAccount);
router.get('/export', settingsController.exportData);

export default router;
