import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    getAllDevices,
    getDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    getThreshold,
    updateThreshold,
    syncThreshold,
    getSensorData,
    getLocationHistory
} from '../controllers/deviceController.js';

const router = Router();

// List and create routes first
router.get('/', authenticate(true), getAllDevices);
router.post('/', authenticate(true), createDevice);

// Specific routes before parameterized routes
router.get('/threshold/:id', authenticate(true), getThreshold);
router.patch('/threshold/:id', authenticate(true), updateThreshold);
router.post('/threshold/:id/sync', authenticate(true), syncThreshold);

// Parameterized routes last
router.get('/:id', authenticate(true), getDevice);
router.get('/:id/sensors', authenticate(true), getSensorData);
router.get('/:id/location', authenticate(true), getLocationHistory);
router.put('/:id', authenticate(true), updateDevice);
router.delete('/:id', authenticate(true), deleteDevice);

export default router;