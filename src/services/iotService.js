import Joi from 'joi';
import { prisma } from '../config/database.js';
import { evaluateAndAlert } from './alertService.js';
import { emitSensorReading, emitDeviceLocation } from '../realtime/emitter.js';
import { logger, logError } from '../utils/logger.js';
import { normalizeNumericStrings } from '../utils/normalize.js';

// Valid sensor types
const VALID_SENSOR_TYPES = ['temperature', 'humidity', 'pressure'];

// Schema cho dữ liệu từ thiết bị
const ingestSchema = Joi.object({
  timestamp: Joi.alternatives().try(Joi.string(), Joi.number()),

  state: Joi.string().optional(),
  control: Joi.object().unknown(true).optional(),

  data: Joi.object({
    sensors: Joi.array().items(Joi.object({
      type: Joi.string().valid(...VALID_SENSOR_TYPES).required(),
      value: Joi.number().required()
    })).optional(),
    gps: Joi.object({
      lat: Joi.number().required(),
      lon: Joi.number().required(),
      valid: Joi.boolean().optional()
    }).optional()
  }).required()
});

export async function handleIncomingMqttData(topic, message) {
  const parts = topic.split('/');
  const deviceId = parts[1];
  try {
    let payload = JSON.parse(message.toString());
    logger.debug('Received raw MQTT payload', { deviceId, payload });

    payload = normalizeNumericStrings(payload);
    logger.debug('Normalized payload', { deviceId, payload });

    const { error, value } = ingestSchema.validate(payload);
    if (error) {
      throw Object.assign(new Error(error.message), { status: 400 });
    }

    await processPayload(deviceId, value);
  } catch (err) {
    if (err instanceof Error) logError(err, 'Failed to handle MQTT payload', { topic, deviceId });
    else logger.error('Failed to handle MQTT payload', { err, topic, deviceId });
  }
}

export async function processPayload(deviceId, payload) {
  const device = await prisma.device.findUnique({ where: { deviceId } });
  if (!device) throw Object.assign(new Error('Unknown device'), { status: 401 });

  const data = payload.data;
  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

  // Process sensor readings
  if (data.sensors && data.sensors.length > 0) {
    await processSensorReadings(deviceId, device, data.sensors, timestamp);
  }

  // Process GPS location
  if (data.gps && data.gps.valid !== false) {
    await processLocation(deviceId, device, data.gps, timestamp);
  }

  // Evaluate alerts for each sensor reading
  if (data.sensors) {
    for (const sensor of data.sensors) {
      await evaluateAndAlert(device, { type: sensor.type, value: sensor.value });
    }
  }
}

async function processSensorReadings(deviceIdentifier, device, sensors, timestamp) {
  // deviceIdentifier: string like "esp32-001" for realtime events
  // device: full device object with device.id (integer) for DB

  const readings = sensors.map(sensor => ({
    deviceId: device.id, // Foreign key to Device table
    type: sensor.type,
    value: sensor.value,
    createdAt: timestamp
  }));

  await prisma.sensorReading.createMany({
    data: readings
  });

  // Emit realtime events for each sensor reading
  for (const sensor of sensors) {
    emitSensorReading(deviceIdentifier, {
      deviceId: deviceIdentifier, // String identifier for frontend
      type: sensor.type,
      value: sensor.value,
      createdAt: timestamp.toISOString()
    });
  }
}

async function processLocation(deviceIdentifier, device, gps, timestamp) {
  // deviceIdentifier: string like "esp32-001" for realtime events
  // device: full device object with device.id (integer) for DB

  await prisma.deviceLocation.create({
    data: {
      deviceId: device.id, // Foreign key to Device table
      latitude: gps.lat,
      longitude: gps.lon,
      createdAt: timestamp
    }
  });

  // Emit realtime location event
  emitDeviceLocation(deviceIdentifier, {
    deviceId: deviceIdentifier, // String identifier for frontend
    latitude: gps.lat,
    longitude: gps.lon,
    createdAt: timestamp.toISOString()
  });
}

export async function ingestHttp(body) {
  if (!body.device_id) {
    throw Object.assign(new Error('device_id is required'), { status: 400 });
  }

  const { error, value } = ingestSchema.validate(body);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return processPayload(body.device_id, value);
}

// Utility functions to fetch data
export async function getSensorReadings(deviceId, type, startTime, endTime, limit = 100) {
  return await prisma.sensorReading.findMany({
    where: {
      device: { deviceId },
      type,
      createdAt: {
        gte: startTime,
        lte: endTime
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

export async function getDeviceLocations(deviceId, startTime, endTime, limit = 100) {
  return await prisma.deviceLocation.findMany({
    where: {
      device: { deviceId },
      createdAt: {
        gte: startTime,
        lte: endTime
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

