import { prisma } from '../config/database.js';
import { getMqttClient } from '../config/mqtt.js';
import { logger, logError } from '../utils/logger.js';

/**
 * Format thresholds thành message để gửi qua MQTT
 */
function formatThresholdsMessage(thresholds) {
  // Convert array to object format
  const thresholdConfig = thresholds.reduce((acc, t) => {
    acc[t.type] = { min: t.min, max: t.max };
    return acc;
  }, {});

  return {
    type: 'thresholds',
    timestamp: new Date().toISOString(),
    config: thresholdConfig
  };
}

/**
 * Gửi threshold configuration cho một device qua MQTT
 */
export async function sendDeviceThresholds(deviceId) {
  try {
    // Tìm device trong DB
    const device = await prisma.device.findUnique({
      where: { deviceId },
      include: {
        thresholds: true
      }
    });

    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Format message
    const message = formatThresholdsMessage(device.thresholds);

    // Gửi qua MQTT
    const client = getMqttClient();
    if (!client) {
      throw new Error('MQTT client not initialized');
    }

    const topic = `iot/${deviceId}/config`;
    return new Promise((resolve, reject) => {
      client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
        if (err) {
          logError(err, 'Failed to publish device config', { deviceId, topic });
          reject(err);
        } else {
          logger.info('Device config published', { deviceId, thresholdCount: device.thresholds.length });
          resolve(message);
        }
      });
    });
  } catch (err) {
    logError(err, 'Failed to send device thresholds', { deviceId });
    throw err;
  }
}

/**
 * Gửi lại threshold cho device sau khi có update
 */
export async function handleThresholdUpdate(deviceId) {
  try {
    await sendDeviceThresholds(deviceId);
  } catch (err) {
    logError(err, 'Failed to sync device thresholds after update', { deviceId });
  }
}