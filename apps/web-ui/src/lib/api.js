import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor - ĐÃ SỬA: Đúng format X-User-Identity
apiClient.interceptors.request.use(
    (config) => {
        const orgContext = localStorage.getItem('selectedOrg')
        const userId = localStorage.getItem('userId') || 'user1'

        // CRITICAL: Gateway yêu cầu format: {organization}:{userId}
        if (orgContext) {
            config.headers['X-User-Identity'] = `${orgContext}:${userId}`
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const message = error.response.data?.error || error.response.data?.message || 'An error occurred'
            toast.error(message)
        } else if (error.request) {
            toast.error('Network error - please check your connection')
        } else {
            toast.error('An unexpected error occurred')
        }
        return Promise.reject(error)
    }
)

// ============================================
// PRODUCT APIs (V2 - Đúng theo Gateway Guide)
// ============================================

export const productApi = {
    // Create new product (Manufacturer only)
    create: async (data) => {
        const response = await apiClient.post('/api/v2/products', data)
        return response.data
    },

    // Get product by ID
    getById: async (productId) => {
        const response = await apiClient.get(`/api/v2/products/${productId}`)
        return response.data
    },

    // Get all products (with optional filters)
    getAll: async (filters = {}) => {
        const params = {}
        if (filters.status) params.status = filters.status
        if (filters.owner) params.owner = filters.owner

        const response = await apiClient.get('/api/v2/products', { params })
        return response.data
    },

    // Get product history (audit trail)
    getHistory: async (productId) => {
        const response = await apiClient.get(`/api/v2/products/${productId}/history`)
        return response.data
    },
}

// ============================================
// HANDOVER APIs (V2 - Auto-signature by Gateway)
// ============================================

export const handoverApi = {
    // Request handover: Manufacturer → Shipper
    requestManufacturerToShipper: async (data) => {
        // Gateway auto-signs with Manufacturer's key
        const response = await apiClient.post('/api/v2/handovers/manufacturer-shipper', {
            productId: data.productId,
            shipperId: data.shipperId,
            waybill: data.waybill,
            // NO signature needed - gateway handles it!
        })
        return response.data
    },

    // Request handover: Shipper → Warehouse
    requestShipperToWarehouse: async (data) => {
        // Gateway auto-signs with Shipper's key
        const response = await apiClient.post('/api/v2/handovers/shipper-warehouse', {
            productId: data.productId,
            warehouseId: data.warehouseId,
            // NO signature needed - gateway handles it!
        })
        return response.data
    },

    // Get pending handovers for current organization
    getPending: async () => {
        const response = await apiClient.get('/api/v2/handovers/pending')
        return response.data
    },

    // Accept handover (Gateway auto-queries nonce and signs)
    accept: async (handoverId, data) => {
        // Gateway automatically:
        // 1. Queries handover to get nonce
        // 2. Generates message: {handoverId}:{nonce}:{receiverId}
        // 3. Signs with recipient's private key
        // 4. Submits to blockchain
        const response = await apiClient.post(`/api/v2/handovers/${handoverId}/accept`, {
            receiverId: data.receiverId,
            // NO signature needed - gateway handles it!
        })
        return response.data
    },

    // Reject handover (Gateway auto-signs)
    reject: async (handoverId, data) => {
        const response = await apiClient.post(`/api/v2/handovers/${handoverId}/reject`, {
            reason: data.reason,
            // NO signature needed - gateway handles it!
        })
        return response.data
    },

    // Get handover by ID
    getById: async (handoverId) => {
        const response = await apiClient.get(`/api/v2/handovers/${handoverId}`)
        return response.data
    },
}

// ============================================
// HEALTH CHECK API
// ============================================

export const healthApi = {
    check: async () => {
        const response = await apiClient.get('/health')
        return response.data
    },
}

export default apiClient