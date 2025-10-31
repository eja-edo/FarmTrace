import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createShipment,
  listShipments,
  getShipment,
  updateShipment,
  deleteShipment,
  getShipmentStats
} from '../controllers/shipmentController.js';

const router = Router();

// Stats endpoint (before :id route to avoid conflict)
router.get('/stats', authenticate(true), getShipmentStats);

// CRUD routes
router.post('/', authenticate(true), createShipment);
router.get('/', authenticate(true), listShipments);
router.get('/:id', authenticate(true), getShipment);
router.patch('/:id', authenticate(true), updateShipment);
router.delete('/:id', authenticate(true), deleteShipment);

export default router;
