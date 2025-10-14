import { prisma } from '../config/database.js';

export async function getOrderTracking(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const latest = await prisma.sensorData.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, data: latest });
  } catch (err) {
    next(err);
  }
}

