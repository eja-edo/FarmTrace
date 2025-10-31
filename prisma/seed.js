import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', passwordHash, role: 'admin' }
  });

  // Create devices
  const device1 = await prisma.device.upsert({
    where: { deviceId: 'esp32-001' },
    update: {},
    create: {
      deviceId: 'esp32-001',
      name: 'Truck Sensor 1',
      secretHash: await bcrypt.hash('devicesecret', 10)
    }
  });

  const device2 = await prisma.device.upsert({
    where: { deviceId: 'esp32-002' },
    update: {},
    create: {
      deviceId: 'esp32-002',
      name: 'Truck Sensor 2',
      secretHash: await bcrypt.hash('devicesecret', 10)
    }
  });

  // Create vehicles
  const vehicle1 = await prisma.vehicle.upsert({
    where: { plate: '51A-12345' },
    update: {},
    create: { plate: '51A-12345', name: 'Truck A' }
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { plate: '51A-67890' },
    update: {},
    create: { plate: '51A-67890', name: 'Truck B' }
  });

  // Create orders
  const order1 = await prisma.order.upsert({
    where: { code: 'ORD-0001' },
    update: {},
    create: { code: 'ORD-0001', product: 'Fresh Milk' }
  });

  const order2 = await prisma.order.upsert({
    where: { code: 'ORD-0002' },
    update: {},
    create: { code: 'ORD-0002', product: 'Frozen Fish' }
  });

  // Create shipments with multiple orders
  const shipment1 = await prisma.shipment.create({
    data: {
      deviceId: device1.id,
      vehicleId: vehicle1.id,
      route: 'HCM -> HN',
      orders: {
        create: [
          { orderId: order1.id },
          { orderId: order2.id }
        ]
      }
    }
  });

  // Create thresholds for different sensor types
  const thresholds = [
    { deviceId: device1.id, type: 'temperature', min: 2, max: 8 },
    { deviceId: device1.id, type: 'humidity', min: 30, max: 70 },
    { deviceId: device2.id, type: 'temperature', min: -20, max: -10 },
    { deviceId: device2.id, type: 'humidity', min: 40, max: 80 }
  ];

  for (const t of thresholds) {
    await prisma.threshold.upsert({
      where: { deviceId_type: { deviceId: t.deviceId, type: t.type } },
      update: { min: t.min, max: t.max },
      create: t
    });
  }

  // Create sample sensor readings
  const now = new Date();
  const sensorReadings = [
    { deviceId: device1.id, type: 'temperature', value: 5.5 },
    { deviceId: device1.id, type: 'humidity', value: 45.0 },
    { deviceId: device2.id, type: 'temperature', value: -15.5 },
    { deviceId: device2.id, type: 'humidity', value: 60.0 }
  ];

  for (const reading of sensorReadings) {
    await prisma.sensorReading.create({
      data: reading
    });
  }

  // Create sample device locations
  const locations = [
    { deviceId: device1.id, latitude: 10.762622, longitude: 106.660172 }, // HCM
    { deviceId: device2.id, latitude: 21.028511, longitude: 105.804817 }  // HN
  ];

  for (const loc of locations) {
    await prisma.deviceLocation.create({
      data: loc
    });
  }

  console.log({
    message: 'Seed data created successfully',
    users: [user.email],
    devices: [device1.deviceId, device2.deviceId],
    vehicles: [vehicle1.plate, vehicle2.plate],
    orders: [order1.code, order2.code]
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

