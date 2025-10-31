import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as vehicleController from '../controllers/vehicleController.js';

const router = Router();

router.get('/', authenticate(true), vehicleController.getAllVehicles);
router.get('/:id/track', authenticate(true), vehicleController.getVehicleTrack);

export default router;

