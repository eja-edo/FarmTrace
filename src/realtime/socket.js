import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

let io;

/**
 * Initialize Socket.IO server
 * @param {import('http').Server} httpServer
 * @returns {{ io: Server }}
 */
export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // JWT Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user info to socket
            socket.userId = decoded.userId;
            socket.userRole = decoded.role || 'user';

            logger.info('Socket authenticated', {
                socketId: socket.id,
                userId: socket.userId,
                role: socket.userRole
            });

            next();
        } catch (err) {
            logger.warn('Socket authentication failed', {
                error: err.message,
                socketId: socket.id
            });
            next(new Error('Invalid authentication token'));
        }
    });

    // Connection Handler
    io.on('connection', (socket) => {
        logger.info('Client connected', {
            socketId: socket.id,
            userId: socket.userId
        });

        // Join device rooms
        socket.on('join', async ({ devices, shipments }) => {
            try {
                // Join device rooms
                if (devices && Array.isArray(devices)) {
                    for (const deviceId of devices) {
                        // Verify user has access to this device
                        const hasAccess = await authorizeDeviceAccess(socket.userId, socket.userRole, deviceId);

                        if (hasAccess) {
                            const room = `device:${deviceId}`;
                            socket.join(room);
                            logger.info('Socket joined device room', {
                                socketId: socket.id,
                                userId: socket.userId,
                                room
                            });
                        } else {
                            logger.warn('Unauthorized device access attempt', {
                                socketId: socket.id,
                                userId: socket.userId,
                                deviceId
                            });
                        }
                    }
                }

                // Join shipment rooms
                if (shipments && Array.isArray(shipments)) {
                    for (const shipmentId of shipments) {
                        const hasAccess = await authorizeShipmentAccess(socket.userId, socket.userRole, shipmentId);

                        if (hasAccess) {
                            const room = `shipment:${shipmentId}`;
                            socket.join(room);
                            logger.info('Socket joined shipment room', {
                                socketId: socket.id,
                                userId: socket.userId,
                                room
                            });
                        } else {
                            logger.warn('Unauthorized shipment access attempt', {
                                socketId: socket.id,
                                userId: socket.userId,
                                shipmentId
                            });
                        }
                    }
                }

                socket.emit('joined', {
                    devices: devices || [],
                    shipments: shipments || []
                });
            } catch (err) {
                logger.error('Error joining rooms', {
                    error: err.message,
                    socketId: socket.id
                });
                socket.emit('error', { message: 'Failed to join rooms' });
            }
        });

        // Leave rooms
        socket.on('leave', ({ devices, shipments }) => {
            if (devices) {
                devices.forEach(deviceId => {
                    socket.leave(`device:${deviceId}`);
                    logger.debug('Socket left device room', { socketId: socket.id, deviceId });
                });
            }
            if (shipments) {
                shipments.forEach(shipmentId => {
                    socket.leave(`shipment:${shipmentId}`);
                    logger.debug('Socket left shipment room', { socketId: socket.id, shipmentId });
                });
            }
        });

        // Disconnect Handler
        socket.on('disconnect', (reason) => {
            logger.info('Client disconnected', {
                socketId: socket.id,
                userId: socket.userId,
                reason
            });
        });

        // Error Handler
        socket.on('error', (err) => {
            logger.error('Socket error', {
                error: err.message,
                socketId: socket.id
            });
        });
    });

    logger.info('Socket.IO server initialized');
    return { io };
}

/**
 * Get Socket.IO instance
 * @returns {Server}
 */
export function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initSocket() first.');
    }
    return io;
}

/**
 * Authorization: Check if user has access to device
 * Admin role has access to all devices
 */
async function authorizeDeviceAccess(userId, userRole, deviceId) {
    // Admin has access to everything
    if (userRole === 'admin') {
        return true;
    }

    // Check if device exists
    const device = await prisma.device.findUnique({
        where: { deviceId }
    });

    if (!device) {
        return false;
    }

    // For now, all authenticated users can access devices
    // TODO: Implement user-device relationship in database if needed
    return true;
}

/**
 * Authorization: Check if user has access to shipment
 */
async function authorizeShipmentAccess(userId, userRole, shipmentId) {
    // Admin has access to everything
    if (userRole === 'admin') {
        return true;
    }

    // Check if shipment exists
    const shipment = await prisma.shipment.findUnique({
        where: { id: parseInt(shipmentId) }
    });

    if (!shipment) {
        return false;
    }

    // For now, all authenticated users can access shipments
    // TODO: Implement user-shipment relationship if needed
    return true;
}
