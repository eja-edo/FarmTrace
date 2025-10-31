import { prisma } from '../config/database.js';
import { handleThresholdUpdate } from './deviceConfigService.js';
import { logger } from '../utils/logger.js';

export async function getDeviceThresholds(deviceId) {
  return prisma.threshold.findMany({ where: { deviceId } });
}

export async function upsertDeviceThreshold(deviceId, type, min, max) {
  const result = await prisma.threshold.upsert({
    where: { deviceId_type: { deviceId, type } },
    update: { min, max },
    create: { deviceId, type, min, max }
  });

  // Trigger config sync after update
  logger.info('Threshold updated, syncing with device', { deviceId, type });
  await handleThresholdUpdate(deviceId);

  return result;
}

