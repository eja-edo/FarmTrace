import { prisma } from '../config/database.js';

export async function getVehicleTrack(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const points = await prisma.sensorData.findMany({
      where: { vehicleId: id, latitude: { not: null }, longitude: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, data: points });
  } catch (err) {
    next(err);
  }
}

