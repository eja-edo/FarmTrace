import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as orderController from '../controllers/orderController.js';

const router = Router();

router.get('/', authenticate(true), orderController.getAllOrders);
router.get('/:id/tracking', authenticate(true), orderController.getOrderTracking);

export default router;

