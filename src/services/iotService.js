import Joi from 'joi';
import { prisma } from '../config/database.js';
import { decryptAesGcm } from '../utils/encryption.js';
import { evaluateAndAlert } from './alertService.js';
import { logger } from '../utils/logger.js';

const ingestSchema = Joi.object({
  device_id: Joi.string().required(),
  encrypted_data: Joi.object({
    ciphertext: Joi.string().required(),
    iv: Joi.string().required(),
    authTag: Joi.string().required()
  }).required()
});

export async function handleIncomingMqttData(topic, message) {
  // topic: iot/{deviceId}/data
  const parts = topic.split('/');
  const deviceId = parts[1];
  try {
    const payload = JSON.parse(message.toString());
    await processPayload(deviceId, payload);
  } catch (err) {
    logger.error({ err }, 'Failed to handle MQTT payload');
  }
}

export async function processPayload(deviceId, payload) {
  const device = await prisma.device.findUnique({ where: { deviceId }, include: { shipments: true } });
  if (!device) throw Object.assign(new Error('Unknown device'), { status: 401 });

  const { ciphertext, iv, authTag } = payload.encrypted_data;
  let data;
  try {
    const plaintext = decryptAesGcm(ciphertext, iv, authTag, device.encryptionKey);
    data = JSON.parse(plaintext);
  } catch (e) {
    const status = (e && (e.code === 'ERR_CRYPTO_INVALID_IV_LENGTH' || e.code === 'ERR_CRYPTO_INVALID_AUTHTAG_LENGTH' || e.code === 'ERR_INVALID_KEY_LENGTH' || e.code === 'ERR_CRYPTO_EMPTY_CIPHERTEXT')) ? 400 : 400;
    const err = new Error(`Invalid encrypted payload: ${e?.message || 'decrypt failed'}`);
    err.status = status;
    throw err;
  }
  // expected data: { temperature, humidity, gps: { lat, lon }, orderId, vehicleId }

  const record = await prisma.sensorData.create({
    data: {
      deviceId: device.id,
      temperature: data.temperature ?? null,
      humidity: data.humidity ?? null,
      latitude: data.gps?.lat ?? null,
      longitude: data.gps?.lon ?? null,
      orderId: data.orderId ?? null,
      vehicleId: data.vehicleId ?? null
    }
  });

  await evaluateAndAlert(device, data);
  return record;
}

export async function ingestHttp(body) {
  const { error, value } = ingestSchema.validate(body);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return processPayload(value.device_id, value);
}

