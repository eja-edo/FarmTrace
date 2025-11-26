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

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        const orgContext = localStorage.getItem('selectedOrg')
        const userId = localStorage.getItem('userId') || 'user1'

        // Use X-User-Identity header format: org:userId
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
// PRODUCT APIs
// ============================================

export const productApi = {
    // Create new product (V2)
    create: async (data) => {
        const response = await apiClient.post('/api/v2/products', data)
        return response.data
    },

    // Get product by ID (V2)
    getById: async (productId) => {
        const response = await apiClient.get(`/api/v2/products/${productId}`)
        return response.data
    },

    // Get all products (V2)
    getAll: async (filters = {}) => {
        const response = await apiClient.get('/api/v2/products', { params: filters })
        return response.data
    },

    // Get product history (V2)
    getHistory: async (productId) => {
        const response = await apiClient.get(`/api/v2/products/${productId}/history`)
        return response.data
    },

    // Mark product as sold (V2)
    markAsSold: async (productId, data) => {
        const response = await apiClient.put(`/api/v2/products/${productId}/sold`, data)
        return response.data
    },
}

// ============================================
// HANDOVER APIs
// ============================================

export const handoverApi = {
    // Request handover manufacturer -> shipper (V2)
    requestManufacturerToShipper: async (data) => {
        const response = await apiClient.post('/api/v2/handovers/manufacturer-shipper', data)
        return response.data
    },

    // Request handover shipper -> warehouse (V2)
    requestShipperToWarehouse: async (data) => {
        const response = await apiClient.post('/api/v2/handovers/shipper-warehouse', data)
        return response.data
    },

    // Get pending handovers (V2)
    getPending: async () => {
        const response = await apiClient.get('/api/v2/handovers/pending')
        return response.data
    },

    // Accept handover (V2)
    accept: async (handoverId, data) => {
        const response = await apiClient.post(`/api/v2/handovers/${handoverId}/accept`, data)
        return response.data
    },

    // Reject handover (V2)
    reject: async (handoverId, data) => {
        const response = await apiClient.post(`/api/v2/handovers/${handoverId}/reject`, data)
        return response.data
    },

    // Get handover by ID (V2)
    getById: async (handoverId) => {
        const response = await apiClient.get(`/api/v2/handovers/${handoverId}`)
        return response.data
    },
}

// ============================================
// SHIPMENT APIs
// ============================================

export const shipmentApi = {
    // Create new shipment
    create: async (data) => {
        const response = await apiClient.post('/api/shipments', data)
        return response.data
    },

    // Update shipment
    update: async (shipmentId, data) => {
        const response = await apiClient.patch(`/api/shipments/${shipmentId}`, data)
        return response.data
    },

    // Get shipment by ID
    getById: async (shipmentId) => {
        const response = await apiClient.get(`/api/shipments/${shipmentId}`)
        return response.data
    },
}

// ============================================
// ORDER APIs
// ============================================

export const orderApi = {
    // Create new order
    create: async (data) => {
        const response = await apiClient.post('/api/orders', data)
        return response.data
    },

    // Get order by ID
    getById: async (orderId) => {
        const response = await apiClient.get(`/api/orders/${orderId}`)
        return response.data
    },

    // Get all orders
    getAll: async (filters = {}) => {
        const response = await apiClient.get('/api/orders', { params: filters })
        return response.data
    },
}

// ============================================
// HEALTH CHECK API
// ============================================

export const healthApi = {
    check: async () => {
        const response = await apiClient.get('/api/health')
        return response.data
    },
}

export default apiClient
