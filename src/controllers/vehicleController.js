import { prisma } from '../config/database.js';
import { paginate, paginationMeta, getPaginationParams } from '../utils/pagination.js';

// List all vehicles
export async function getAllVehicles(req, res, next) {
  try {
    const { page, limit } = getPaginationParams(req.query);

    const query = {
      select: {
        id: true,
        plate: true,
        name: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    };

    const result = await paginate(prisma.vehicle, query, page, limit);

    res.json({
      success: true,
      vehicles: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getVehicleTrack(req, res, next) {
  try {
    const vehicleId = parseInt(req.params.id, 10);
    const { page, limit } = getPaginationParams(req.query);

    // Find shipments for this vehicle to discover device IDs
    const shipments = await prisma.shipment.findMany({
      where: { vehicleId },
      include: { device: true }
    });

    if (!shipments || shipments.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalItems: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    const deviceIds = shipments.map(s => s.device.id);

    // Query device locations for devices assigned to this vehicle's shipments
    const query = {
      where: { deviceId: { in: deviceIds } },
      orderBy: { createdAt: 'desc' },
      include: { device: { select: { deviceId: true, name: true } } }
    };

    const result = await paginate(prisma.deviceLocation, query, page, limit);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });
  } catch (err) {
    next(err);
  }
}

