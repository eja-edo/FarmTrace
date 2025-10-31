import { prisma } from '../config/database.js';
import { getMqttClient } from '../config/mqtt.js';
import { emitAlert } from '../realtime/emitter.js';
import { logger, logError } from '../utils/logger.js';

export async function evaluateAndAlert(device, sensorData) {
  // sensorData: { type, value }
  const thresholds = await prisma.threshold.findMany({
    where: {
      deviceId: device.id,
      type: sensorData.type
    }
  });

  const alerts = [];
  for (const threshold of thresholds) {
    if (sensorData.value > threshold.max || sensorData.value < threshold.min) {
      alerts.push({
        type: sensorData.type,
        value: sensorData.value,
        thresholdId: threshold.id
      });
    }
  }

  if (alerts.length === 0) return;

  const records = await prisma.alert.createMany({
    data: alerts.map(a => ({ deviceId: device.id, type: a.type, value: a.value, thresholdId: a.thresholdId }))
  });

  // Publish to MQTT for device notification
  const client = getMqttClient();
  if (client) {
    const topic = `iot/${device.deviceId}/alert`;
    const payload = JSON.stringify({ alerts, at: new Date().toISOString() });
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) logError(err, 'Failed to publish alert', { device: device.deviceId, topic });
    });
  }

  // Emit realtime alert to frontend
  for (const alert of alerts) {
    emitAlert(device.deviceId, {
      deviceId: device.deviceId,
      type: alert.type,
      value: alert.value,
      thresholdId: alert.thresholdId,
      createdAt: new Date().toISOString()
    });
  }

  return records;
}

