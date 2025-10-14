import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', passwordHash, role: 'admin' }
  });

  const device = await prisma.device.upsert({
    where: { deviceId: 'esp32-001' },
    update: {},
    create: {
      deviceId: 'esp32-001',
      name: 'Truck Sensor 1',
      encryptionKey: (process.env.AES_KEY || '0123456789abcdef0123456789abcdef'),
      secretHash: await bcrypt.hash('devicesecret', 10)
    }
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plate: '51A-12345' },
    update: {},
    create: { plate: '51A-12345', name: 'Truck A' }
  });

  const order = await prisma.order.upsert({
    where: { code: 'ORD-0001' },
    update: {},
    create: { code: 'ORD-0001', product: 'Fresh Milk' }
  });

  await prisma.shipment.create({
    data: { orderId: order.id, deviceId: device.id, vehicleId: vehicle.id, route: 'HCM -> HN' }
  });

  await prisma.threshold.upsert({
    where: { deviceId_type: { deviceId: device.id, type: 'temperature' } },
    update: { min: 2, max: 8 },
    create: { deviceId: device.id, type: 'temperature', min: 2, max: 8 }
  });
  await prisma.threshold.upsert({
    where: { deviceId_type: { deviceId: device.id, type: 'humidity' } },
    update: { min: 30, max: 70 },
    create: { deviceId: device.id, type: 'humidity', min: 30, max: 70 }
  });

  console.log({ user: user.email, device: device.deviceId, vehicle: vehicle.plate, order: order.code });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

