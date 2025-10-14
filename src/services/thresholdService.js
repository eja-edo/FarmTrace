import { prisma } from '../config/database.js';

export function getDeviceThresholds(deviceId) {
  return prisma.threshold.findMany({ where: { deviceId } });
}

export function upsertDeviceThreshold(deviceId, type, min, max) {
  return prisma.threshold.upsert({
    where: { deviceId_type: { deviceId, type } },
    update: { min, max },
    create: { deviceId, type, min, max }
  });
}

