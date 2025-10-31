/**
 * Get pagination parameters from query string
 * @param {Object} query - Request query object
 * @returns {Object} - { page, limit }
 */
export function getPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    return { page, limit };
}

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} totalItems - Total number of items
 * @returns {Object} - Pagination metadata
 */
export function paginationMeta(page, limit, totalItems) {
    const totalPages = Math.ceil(totalItems / limit);
    return {
        page,
        limit,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
}

/**
 * Paginate Prisma queries
 * @param {Object} model - Prisma model (e.g., prisma.device)
 * @param {Object} query - Prisma query object (where, include, orderBy, select)
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { data, page, limit, totalPages, totalItems }
 */
export async function paginate(model, query = {}, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const take = limit;

    const [data, totalItems] = await Promise.all([
        model.findMany({
            ...query,
            skip,
            take
        }),
        model.count({ where: query.where })
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
        data,
        page,
        limit,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
}
