import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendDeviceThresholds } from '../services/deviceConfigService.js';
import { getSensorReadings, getDeviceLocations } from '../services/iotService.js';
import { paginate } from '../utils/pagination.js';
import Joi from 'joi';
import bcrypt from 'bcryptjs';

const VALID_SENSOR_TYPES = ['temperature', 'humidity', 'pressure', 'vibration'];

const thresholdSchema = Joi.object({
  type: Joi.string().valid(...VALID_SENSOR_TYPES).required(),
  min: Joi.number().required(),
  max: Joi.number().required()
});

const queryParamsSchema = Joi.object({
  startTime: Joi.date().iso().optional(),
  endTime: Joi.date().iso().optional(),
  limit: Joi.number().min(1).max(1000).optional(),
  type: Joi.string().valid(...VALID_SENSOR_TYPES).optional()
});

const deviceCreateSchema = Joi.object({
  deviceId: Joi.string().required(),
  name: Joi.string().optional(),
  secret: Joi.string().min(8).optional()
});

const deviceUpdateSchema = Joi.object({
  name: Joi.string().optional()
});

// CRUD operations
export async function getAllDevices(req, res, next) {
  try {
    const devices = await prisma.device.findMany({
      select: {
        id: true,
        deviceId: true,
        name: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, devices });
  } catch (err) {
    next(err);
  }
}

export async function getDevice(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        thresholds: true,
        shipments: {
          select: {
            id: true,
            route: true,
            startedAt: true,
            endedAt: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Remove secretHash from response
    const { secretHash, ...deviceData } = device;

    res.json({ success: true, device: deviceData });
  } catch (err) {
    next(err);
  }
}

export async function createDevice(req, res, next) {
  try {
    const { error, value } = deviceCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Check if device already exists
    const existing = await prisma.device.findUnique({
      where: { deviceId: value.deviceId }
    });

    if (existing) {
      return res.status(409).json({ error: 'Device already exists' });
    }

    // Hash secret if provided, otherwise generate random
    const secret = value.secret || Math.random().toString(36).substring(2, 15);
    const secretHash = await bcrypt.hash(secret, 10);

    const device = await prisma.device.create({
      data: {
        deviceId: value.deviceId,
        name: value.name || value.deviceId,
        secretHash
      }
    });

    res.status(201).json({
      success: true,
      device: {
        id: device.id,
        deviceId: device.deviceId,
        name: device.name,
        createdAt: device.createdAt
      },
      secret: value.secret ? undefined : secret // Return secret only if auto-generated
    });
  } catch (err) {
    next(err);
  }
}

export async function updateDevice(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { error, value } = deviceUpdateSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const device = await prisma.device.update({
      where: { id },
      data: value,
      select: {
        id: true,
        deviceId: true,
        name: true,
        createdAt: true
      }
    });

    res.json({ success: true, device });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Device not found' });
    }
    next(err);
  }
}

export async function deleteDevice(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.device.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Device deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Device not found' });
    }
    next(err);
  }
}

// Threshold management
export async function getThreshold(req, res, next) {
  try {
    const deviceId = req.params.id;

    // Tìm device và threshold
    const device = await prisma.device.findUnique({
      where: { deviceId },
      include: {
        thresholds: true
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Format response
    const thresholds = device.thresholds.reduce((acc, t) => {
      acc[t.type] = { min: t.min, max: t.max };
      return acc;
    }, {});

    res.json({ success: true, data: thresholds });
  } catch (err) {
    next(err);
  }
}

export async function updateThreshold(req, res, next) {
  try {
    const deviceId = req.params.id;

    // Validate input
    const { error, value } = thresholdSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Find device
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Update thresholds in transaction
    const updates = [];
    if (value.temperature) {
      updates.push(prisma.threshold.upsert({
        where: { deviceId_type: { deviceId: device.id, type: 'temperature' } },
        update: { min: value.temperature.min, max: value.temperature.max },
        create: { deviceId: device.id, type: 'temperature', min: value.temperature.min, max: value.temperature.max }
      }));
    }
    if (value.humidity) {
      updates.push(prisma.threshold.upsert({
        where: { deviceId_type: { deviceId: device.id, type: 'humidity' } },
        update: { min: value.humidity.min, max: value.humidity.max },
        create: { deviceId: device.id, type: 'humidity', min: value.humidity.min, max: value.humidity.max }
      }));
    }

    const results = await prisma.$transaction(updates);

    // Automatically sync to device via MQTT after update
    await sendDeviceThresholds(deviceId);

    // Format response
    const updatedThresholds = results.reduce((acc, t) => {
      acc[t.type] = { min: t.min, max: t.max };
      return acc;
    }, {});

    res.json({ success: true, data: updatedThresholds });
  } catch (err) {
    logger.error('Failed to update thresholds', { error: err.message, deviceId: req.params.id });
    next(err);
  }
}

export async function syncThreshold(req, res, next) {
  try {
    const deviceId = req.params.id;

    // Check if device exists
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Send current thresholds to device via MQTT
    await sendDeviceThresholds(deviceId);

    res.json({ success: true, message: 'Thresholds synced to device' });
  } catch (err) {
    logger.error('Failed to sync thresholds', { error: err.message, deviceId: req.params.id });
    next(err);
  }
}

// New endpoints for sensor readings and location data
export async function getSensorData(req, res, next) {
  try {
    const deviceId = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const type = req.query.type;
    const startTime = req.query.startTime ? new Date(req.query.startTime) : null;
    const endTime = req.query.endTime ? new Date(req.query.endTime) : null;

    // Build query
    const where = { deviceId };
    if (type) where.type = type;
    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.gte = startTime;
      if (endTime) where.createdAt.lte = endTime;
    }

    const query = {
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        type: true,
        value: true,
        createdAt: true
      }
    };

    const result = await paginate(
      prisma.sensorReading,
      query,
      page,
      limit
    );

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
    logger.error('Failed to get sensor data', { error: err.message, deviceId: req.params.id });
    next(err);
  }
}

export async function getLocationHistory(req, res, next) {
  try {
    const deviceId = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const startTime = req.query.startTime ? new Date(req.query.startTime) : null;
    const endTime = req.query.endTime ? new Date(req.query.endTime) : null;

    // Build query
    const where = { deviceId };
    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.gte = startTime;
      if (endTime) where.createdAt.lte = endTime;
    }

    const query = {
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        latitude: true,
        longitude: true,
        createdAt: true
      }
    };

    const result = await paginate(
      prisma.deviceLocation,
      query,
      page,
      limit
    );

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
    logger.error('Failed to get location history', { error: err.message, deviceId: req.params.id });
    next(err);
  }
}