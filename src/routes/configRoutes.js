import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDeviceConfig, updateDeviceConfig } from '../controllers/configController.js';

const router = Router();

router.get('/device/:id', authenticate(true), getDeviceConfig);
router.post('/device/:id/update', authenticate(true), updateDeviceConfig);

export default router;

