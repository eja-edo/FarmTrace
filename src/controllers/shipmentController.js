import { prisma } from '../config/database.js';
import { paginate, paginationMeta, getPaginationParams } from '../utils/pagination.js';
import Joi from 'joi';

// Validation schemas
const createShipmentSchema = Joi.object({
    deviceId: Joi.string().required(),
    vehicleId: Joi.number().integer().required(),
    orderIds: Joi.array().items(Joi.number().integer()).min(1).required(),
    route: Joi.string().optional().allow(null, '')
});

const updateShipmentSchema = Joi.object({
    route: Joi.string().optional().allow(null, ''),
    endedAt: Joi.date().iso().optional().allow(null)
});

/**
 * Create new shipment
 * POST /shipments
 */
export async function createShipment(req, res, next) {
    try {
        const { error, value } = createShipmentSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const { deviceId, vehicleId, orderIds, route } = value;

        // Verify device exists
        const device = await prisma.device.findUnique({
            where: { deviceId }
        });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Verify vehicle exists
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId }
        });
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // Verify all orders exist
        const orders = await prisma.order.findMany({
            where: { id: { in: orderIds } }
        });
        if (orders.length !== orderIds.length) {
            return res.status(404).json({ error: 'One or more orders not found' });
        }

        // Create shipment with order relationships
        const shipment = await prisma.shipment.create({
            data: {
                deviceId: device.id,
                vehicleId,
                route,
                orders: {
                    create: orderIds.map(orderId => ({ orderId }))
                }
            },
            include: {
                device: { select: { deviceId: true, name: true } },
                vehicle: { select: { plate: true, name: true } },
                orders: {
                    include: {
                        order: { select: { code: true, product: true } }
                    }
                }
            }
        });

        res.status(201).json({ success: true, data: shipment });
    } catch (err) {
        next(err);
    }
}

/**
 * List all shipments with pagination
 * GET /shipments?page=1&limit=20&status=active
 */
export async function listShipments(req, res, next) {
    try {
        const { page, limit } = getPaginationParams(req.query);
        const { status } = req.query;

        const where = {};
        if (status === 'active') {
            where.endedAt = null;
        } else if (status === 'completed') {
            where.endedAt = { not: null };
        }

        const query = {
            where,
            orderBy: { startedAt: 'desc' },
            include: {
                device: { select: { deviceId: true, name: true } },
                vehicle: { select: { plate: true, name: true } },
                orders: {
                    include: {
                        order: { select: { code: true, product: true } }
                    }
                }
            }
        };

        const result = await paginate(prisma.shipment, query, page, limit);

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                totalItems: result.totalItems,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get shipment by ID with tracking data
 * GET /shipments/:id
 */
export async function getShipment(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);

        const shipment = await prisma.shipment.findUnique({
            where: { id },
            include: {
                device: { select: { deviceId: true, name: true } },
                vehicle: { select: { plate: true, name: true } },
                orders: {
                    include: {
                        order: { select: { code: true, product: true } }
                    }
                }
            }
        });

        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        // Get recent sensor readings
        const sensors = await prisma.sensorReading.findMany({
            where: {
                deviceId: shipment.deviceId,
                createdAt: { gte: shipment.startedAt }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // Get recent locations
        const locations = await prisma.deviceLocation.findMany({
            where: {
                deviceId: shipment.deviceId,
                createdAt: { gte: shipment.startedAt }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // Get alerts
        const alerts = await prisma.alert.findMany({
            where: {
                deviceId: shipment.deviceId,
                createdAt: { gte: shipment.startedAt }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json({
            success: true,
            data: {
                ...shipment,
                tracking: {
                    sensors,
                    locations,
                    alerts
                }
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Update shipment
 * PATCH /shipments/:id
 */
export async function updateShipment(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const { error, value } = updateShipmentSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const shipment = await prisma.shipment.update({
            where: { id },
            data: value,
            include: {
                device: { select: { deviceId: true, name: true } },
                vehicle: { select: { plate: true, name: true } },
                orders: {
                    include: {
                        order: { select: { code: true, product: true } }
                    }
                }
            }
        });

        res.json({ success: true, data: shipment });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        next(err);
    }
}

/**
 * Delete shipment
 * DELETE /shipments/:id
 */
export async function deleteShipment(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);

        await prisma.shipment.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Shipment deleted' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        next(err);
    }
}

/**
 * Get shipment statistics
 * GET /shipments/stats
 */
export async function getShipmentStats(req, res, next) {
    try {
        const [total, active, completed] = await Promise.all([
            prisma.shipment.count(),
            prisma.shipment.count({ where: { endedAt: null } }),
            prisma.shipment.count({ where: { endedAt: { not: null } } })
        ]);

        res.json({
            success: true,
            data: {
                total,
                active,
                completed
            }
        });
    } catch (err) {
        next(err);
    }
}
