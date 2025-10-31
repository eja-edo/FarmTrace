import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDeviceConfig, updateDeviceConfig, syncDeviceConfig } from '../controllers/configController.js';

const router = Router();

router.get('/device/:id', authenticate(true), getDeviceConfig);
router.post('/device/:id/update', authenticate(true), updateDeviceConfig);
router.post('/device/:id/sync', authenticate(true), syncDeviceConfig);

export default router;

