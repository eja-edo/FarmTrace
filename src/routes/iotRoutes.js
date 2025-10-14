import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as iotController from '../controllers/iotController.js';

const router = Router();

router.post('/data', authenticate(true), iotController.ingestData);

export default router;

