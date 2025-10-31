import { prisma } from '../config/database.js';
import { getDeviceThresholds, upsertDeviceThreshold } from '../services/thresholdService.js';
import Joi from 'joi';

export async function getDeviceConfig(req, res, next) {
  try {
    const deviceIdParam = req.params.id;
    const device = await prisma.device.findUnique({ where: { deviceId: deviceIdParam } });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const thresholds = await getDeviceThresholds(device.id);
    res.json({ success: true, data: { deviceId: device.deviceId, thresholds } });
  } catch (err) {
    next(err);
  }
}

const updateSchema = Joi.object({
  type: Joi.string().valid('temperature', 'humidity').required(),
  min: Joi.number().required(),
  max: Joi.number().required()
});

export async function updateDeviceConfig(req, res, next) {
  try {
    const deviceIdParam = req.params.id;
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const device = await prisma.device.findUnique({ where: { deviceId: deviceIdParam } });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const updated = await upsertDeviceThreshold(device.id, value.type, value.min, value.max);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function syncDeviceConfig(req, res, next) {
  try {
    const deviceIdParam = req.params.id;
    const device = await prisma.device.findUnique({ where: { deviceId: deviceIdParam } });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const { sendDeviceThresholds } = await import('../services/deviceConfigService.js');
    const result = await sendDeviceThresholds(deviceIdParam);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

