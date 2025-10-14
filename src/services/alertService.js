import { prisma } from '../config/database.js';
import { getMqttClient } from '../config/mqtt.js';
import { logger } from '../utils/logger.js';

export async function evaluateAndAlert(device, data) {
  // data: { temperature, humidity, gps: { lat, lon } }
  const thresholds = await prisma.threshold.findMany({ where: { deviceId: device.id } });
  const alerts = [];
  for (const t of thresholds) {
    if (t.type === 'temperature' && data.temperature != null) {
      if (data.temperature > t.max || data.temperature < t.min) {
        alerts.push({ type: 'temperature', value: data.temperature, thresholdId: t.id });
      }
    }
    if (t.type === 'humidity' && data.humidity != null) {
      if (data.humidity > t.max || data.humidity < t.min) {
        alerts.push({ type: 'humidity', value: data.humidity, thresholdId: t.id });
      }
    }
  }

  if (alerts.length === 0) return;

  const records = await prisma.alert.createMany({
    data: alerts.map(a => ({ deviceId: device.id, type: a.type, value: a.value, thresholdId: a.thresholdId }))
  });

  const client = getMqttClient();
  if (client) {
    const topic = `iot/${device.deviceId}/alert`;
    const payload = JSON.stringify({ alerts, at: new Date().toISOString() });
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) logger.error({ err }, 'Failed to publish alert');
    });
  }

  return records;
}

