import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    getDeviceStats,
    getSensorStats,
    getAlertStats,
    getShipmentStats,
    getDashboardOverview
} from '../services/analyticsService.js';

const router = Router();

/**
 * GET /analytics/dashboard
 * Get realtime dashboard overview with stats from last 24h
 */
router.get('/dashboard', authenticate(true), async (req, res, next) => {
    try {
        const overview = await getDashboardOverview();
        res.json({ success: true, data: overview });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /analytics/devices
 * Get device statistics
 */
router.get('/devices', authenticate(true), async (req, res, next) => {
    try {
        const stats = await getDeviceStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /analytics/sensors/:deviceId
 * Get sensor statistics for a specific device
 * Query params: type, startTime, endTime
 */
router.get('/sensors/:deviceId', authenticate(true), async (req, res, next) => {
    try {
        const { deviceId } = req.params;
        const { type, startTime, endTime } = req.query;

        if (!type) {
            return res.status(400).json({ error: 'type parameter is required' });
        }

        const start = startTime ? new Date(startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = endTime ? new Date(endTime) : new Date();

        const stats = await getSensorStats(deviceId, type, start, end);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /analytics/alerts
 * Get alert statistics
 * Query params: startTime, endTime
 */
router.get('/alerts', authenticate(true), async (req, res, next) => {
    try {
        const { startTime, endTime } = req.query;

        const start = startTime ? new Date(startTime) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endTime ? new Date(endTime) : new Date();

        const stats = await getAlertStats(start, end);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /analytics/shipments
 * Get shipment statistics
 * Query params: startTime, endTime
 */
router.get('/shipments', authenticate(true), async (req, res, next) => {
    try {
        const { startTime, endTime } = req.query;

        const start = startTime ? new Date(startTime) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endTime ? new Date(endTime) : new Date();

        const stats = await getShipmentStats(start, end);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
});

export default router;
