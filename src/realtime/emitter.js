import { getIO } from './socket.js';
import { throttle } from '../utils/throttle.js';
import { logger } from '../utils/logger.js';

// Throttle intervals (milliseconds)
const THROTTLE_INTERVALS = {
    sensor_reading: 500,      // 2 Hz max
    device_location: 1000,    // 1 Hz max
    alert: 0                  // No throttling for alerts
};

/**
 * Emit sensor reading to device room
 * @param {string} deviceId - Device identifier
 * @param {object} payload - { deviceId, type, value, createdAt }
 */
export function emitSensorReading(deviceId, payload) {
    try {
        const io = getIO();
        const room = `device:${deviceId}`;
        const throttleKey = `${deviceId}:sensor_reading:${payload.type}`;

        throttle(throttleKey, THROTTLE_INTERVALS.sensor_reading, () => {
            io.to(room).emit('sensor_reading', payload);
            logger.debug('Emitted sensor_reading', { deviceId, type: payload.type, room });
        });
    } catch (err) {
        logger.error('Failed to emit sensor_reading', {
            error: err.message,
            deviceId
        });
    }
}

/**
 * Emit device location to device room
 * @param {string} deviceId - Device identifier
 * @param {object} payload - { deviceId, latitude, longitude, createdAt }
 */
export function emitDeviceLocation(deviceId, payload) {
    try {
        const io = getIO();
        const room = `device:${deviceId}`;
        const throttleKey = `${deviceId}:device_location`;

        throttle(throttleKey, THROTTLE_INTERVALS.device_location, () => {
            io.to(room).emit('device_location', payload);
            logger.debug('Emitted device_location', { deviceId, room });
        });
    } catch (err) {
        logger.error('Failed to emit device_location', {
            error: err.message,
            deviceId
        });
    }
}

/**
 * Emit alert to device room (no throttling)
 * @param {string} deviceId - Device identifier
 * @param {object} payload - { deviceId, type, value, thresholdId, createdAt }
 */
export function emitAlert(deviceId, payload) {
    try {
        const io = getIO();
        const room = `device:${deviceId}`;

        io.to(room).emit('alert', payload);
        logger.info('Emitted alert', { deviceId, type: payload.type, room });
    } catch (err) {
        logger.error('Failed to emit alert', {
            error: err.message,
            deviceId
        });
    }
}

/**
 * Emit multiple sensor readings in batch
 * @param {string} deviceId
 * @param {Array} readings - Array of sensor reading payloads
 */
export function emitSensorReadingsBatch(deviceId, readings) {
    try {
        const io = getIO();
        const room = `device:${deviceId}`;

        io.to(room).emit('sensor_readings_batch', { deviceId, readings });
        logger.debug('Emitted sensor_readings_batch', { deviceId, count: readings.length });
    } catch (err) {
        logger.error('Failed to emit sensor_readings_batch', {
            error: err.message,
            deviceId
        });
    }
}

/**
 * Emit to shipment room (for multiple devices in a shipment)
 * @param {number} shipmentId
 * @param {string} eventType
 * @param {object} payload
 */
export function emitToShipment(shipmentId, eventType, payload) {
    try {
        const io = getIO();
        const room = `shipment:${shipmentId}`;

        io.to(room).emit(eventType, payload);
        logger.debug('Emitted to shipment', { shipmentId, eventType, room });
    } catch (err) {
        logger.error('Failed to emit to shipment', {
            error: err.message,
            shipmentId,
            eventType
        });
    }
}

/**
 * Get realtime statistics
 * @returns {object} - { connectedClients, rooms }
 */
export function getRealtimeStats() {
    try {
        const io = getIO();
        const sockets = io.sockets.sockets;

        const stats = {
            connectedClients: sockets.size,
            rooms: Array.from(io.sockets.adapter.rooms.keys()).filter(r => r.startsWith('device:') || r.startsWith('shipment:'))
        };

        return stats;
    } catch (err) {
        logger.error('Failed to get realtime stats', { error: err.message });
        return { connectedClients: 0, rooms: [] };
    }
}
