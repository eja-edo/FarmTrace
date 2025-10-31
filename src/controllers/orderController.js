import { prisma } from '../config/database.js';
import { paginate, getPaginationParams } from '../utils/pagination.js';

/**
 * List all orders
 */
export async function getAllOrders(req, res, next) {
  try {
    const { page, limit } = getPaginationParams(req.query);

    const query = {
      select: {
        id: true,
        code: true,
        product: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    };

    const result = await paginate(prisma.order, query, page, limit);

    res.json({
      success: true,
      orders: result.data,
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

/**
 * Get order tracking information with latest sensor readings and locations
 */
export async function getOrderTracking(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { page, limit } = getPaginationParams(req.query);

    // Get order with shipments
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        shipments: {
          include: {
            shipment: {
              include: {
                device: {
                  select: {
                    id: true,
                    deviceId: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get all device IDs from order's shipments
    const deviceIds = order.shipments
      .map(so => so.shipment.device.id)
      .filter(id => id);

    if (deviceIds.length === 0) {
      return res.json({
        success: true,
        order: {
          id: order.id,
          code: order.code,
          product: order.product
        },
        tracking: [],
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

    // Get paginated location data
    const locationQuery = {
      where: {
        deviceId: { in: deviceIds }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        latitude: true,
        longitude: true,
        speed: true,
        createdAt: true,
        deviceId: true
      }
    };

    const result = await paginate(
      prisma.deviceLocation,
      locationQuery,
      page,
      limit
    );

    res.json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        product: order.product
      },
      tracking: result.data,
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

