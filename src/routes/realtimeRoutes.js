import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getRealtimeStats } from '../realtime/emitter.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * SSE (Server-Sent Events) endpoint for device realtime data
 * Fallback for clients that don't support WebSocket
 */
router.get('/stream/devices/:id', authenticate(true), async (req, res) => {
    const deviceId = req.params.id;

    try {
        // Verify device exists
        const device = await prisma.device.findUnique({
            where: { deviceId }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connected', deviceId })}\n\n`);

        logger.info('SSE client connected', { deviceId, userId: req.user?.userId });

        // Subscribe to device events (simplified - in production, use event emitter or Redis pub/sub)
        const intervalId = setInterval(async () => {
            try {
                // Fetch latest sensor reading
                const latestSensor = await prisma.sensorReading.findFirst({
                    where: { device: { deviceId } },
                    orderBy: { createdAt: 'desc' }
                });

                if (latestSensor) {
                    const event = {
                        type: 'sensor_reading',
                        data: {
                            deviceId,
                            type: latestSensor.type,
                            value: latestSensor.value,
                            createdAt: latestSensor.createdAt.toISOString()
                        }
                    };
                    res.write(`event: sensor_reading\ndata: ${JSON.stringify(event.data)}\n\n`);
                }

                // Fetch latest location
                const latestLocation = await prisma.deviceLocation.findFirst({
                    where: { device: { deviceId } },
                    orderBy: { createdAt: 'desc' }
                });

                if (latestLocation) {
                    const event = {
                        type: 'device_location',
                        data: {
                            deviceId,
                            latitude: latestLocation.latitude,
                            longitude: latestLocation.longitude,
                            createdAt: latestLocation.createdAt.toISOString()
                        }
                    };
                    res.write(`event: device_location\ndata: ${JSON.stringify(event.data)}\n\n`);
                }
            } catch (err) {
                logger.error('SSE polling error', { error: err.message, deviceId });
            }
        }, 2000); // Poll every 2 seconds

        // Cleanup on client disconnect
        req.on('close', () => {
            clearInterval(intervalId);
            logger.info('SSE client disconnected', { deviceId, userId: req.user?.userId });
            res.end();
        });

    } catch (err) {
        logger.error('SSE stream error', { error: err.message, deviceId });
        res.status(500).json({ error: 'Failed to establish SSE stream' });
    }
});

/**
 * Get realtime statistics
 */
router.get('/realtime/stats', authenticate(true), (req, res) => {
    try {
        const stats = getRealtimeStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        logger.error('Failed to get realtime stats', { error: err.message });
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * Health check for realtime services
 */
router.get('/realtime/health', (req, res) => {
    try {
        const stats = getRealtimeStats();
        res.json({
            status: 'ok',
            realtime: {
                enabled: true,
                connectedClients: stats.connectedClients
            }
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            realtime: { enabled: false }
        });
    }
});

export default router;
