import { Router } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/login', authController.loginUser);
router.post('/device', authController.authDevice);

export default router;

