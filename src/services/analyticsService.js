import { prisma } from '../config/database.js';

/**
 * Analytics Service
 * Provides aggregated statistics and insights
 */

/**
 * Get device statistics
 */
export async function getDeviceStats() {
    const [total, active, withAlerts] = await Promise.all([
        prisma.device.count(),
        prisma.device.count({
            where: {
                shipments: {
                    some: { endedAt: null }
                }
            }
        }),
        prisma.device.count({
            where: {
                alerts: {
                    some: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
                        }
                    }
                }
            }
        })
    ]);

    return { total, active, withAlerts, inactive: total - active };
}

/**
 * Get sensor reading statistics for a device
 */
export async function getSensorStats(deviceId, type, startTime, endTime) {
    const device = await prisma.device.findUnique({
        where: { deviceId }
    });

    if (!device) {
        throw new Error('Device not found');
    }

    const readings = await prisma.sensorReading.findMany({
        where: {
            deviceId: device.id,
            type,
            createdAt: {
                gte: startTime,
                lte: endTime
            }
        },
        select: { value: true }
    });

    if (readings.length === 0) {
        return { count: 0, min: null, max: null, avg: null };
    }

    const values = readings.map(r => r.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
        count: readings.length,
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        avg: parseFloat(avg.toFixed(2))
    };
}

/**
 * Get alert statistics
 */
export async function getAlertStats(startTime, endTime) {
    const [total, byType] = await Promise.all([
        prisma.alert.count({
            where: {
                createdAt: { gte: startTime, lte: endTime }
            }
        }),
        prisma.alert.groupBy({
            by: ['type'],
            where: {
                createdAt: { gte: startTime, lte: endTime }
            },
            _count: { type: true }
        })
    ]);

    return {
        total,
        byType: byType.map(item => ({
            type: item.type,
            count: item._count.type
        }))
    };
}

/**
 * Get shipment statistics
 */
export async function getShipmentStats(startTime, endTime) {
    const [total, active, completed, avgDuration] = await Promise.all([
        prisma.shipment.count({
            where: {
                startedAt: { gte: startTime, lte: endTime }
            }
        }),
        prisma.shipment.count({
            where: {
                startedAt: { gte: startTime, lte: endTime },
                endedAt: null
            }
        }),
        prisma.shipment.count({
            where: {
                startedAt: { gte: startTime, lte: endTime },
                endedAt: { not: null }
            }
        }),
        prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) as avg_seconds
      FROM "Shipment"
      WHERE "endedAt" IS NOT NULL
        AND "startedAt" >= ${startTime}
        AND "startedAt" <= ${endTime}
    `
    ]);

    const avgDurationHours = avgDuration[0]?.avg_seconds
        ? parseFloat((avgDuration[0].avg_seconds / 3600).toFixed(2))
        : null;

    return {
        total,
        active,
        completed,
        avgDurationHours
    };
}

/**
 * Get realtime dashboard overview
 */
export async function getDashboardOverview() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [deviceStats, alertStats, shipmentStats, recentAlerts] = await Promise.all([
        getDeviceStats(),
        getAlertStats(last24h, now),
        getShipmentStats(last24h, now),
        prisma.alert.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                device: { select: { deviceId: true, name: true } },
                threshold: { select: { min: true, max: true } }
            }
        })
    ]);

    return {
        devices: deviceStats,
        alerts: alertStats,
        shipments: shipmentStats,
        recentAlerts
    };
}
