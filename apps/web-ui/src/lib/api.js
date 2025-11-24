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
        if (orgContext) {
            config.headers['X-Org-Context'] = orgContext
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
    // Create new product
    create: async (data) => {
        const response = await apiClient.post('/api/products', data)
        return response.data
    },

    // Get product by ID
    getById: async (productId) => {
        const response = await apiClient.get(`/api/products/${productId}`)
        return response.data
    },

    // Get all products
    getAll: async (filters = {}) => {
        const response = await apiClient.get('/api/products', { params: filters })
        return response.data
    },

    // Get product history
    getHistory: async (productId) => {
        const response = await apiClient.get(`/api/products/${productId}/history`)
        return response.data
    },

    // Update product status
    updateStatus: async (productId, status) => {
        const response = await apiClient.patch(`/api/products/${productId}/status`, { status })
        return response.data
    },
}

// ============================================
// HANDOVER APIs
// ============================================

export const handoverApi = {
    // Request handover to shipper
    requestToShipper: async (data) => {
        const response = await apiClient.post('/api/handovers/request-shipper', data)
        return response.data
    },

    // Get pending handovers for organization
    getPending: async (organization) => {
        const response = await apiClient.get('/api/handovers/pending', { params: { organization } })
        return response.data
    },

    // Accept handover
    accept: async (handoverId, data) => {
        const response = await apiClient.post(`/api/handovers/${handoverId}/accept`, data)
        return response.data
    },

    // Reject handover
    reject: async (handoverId, data) => {
        const response = await apiClient.post(`/api/handovers/${handoverId}/reject`, data)
        return response.data
    },

    // Get handover by ID
    getById: async (handoverId) => {
        const response = await apiClient.get(`/api/handovers/${handoverId}`)
        return response.data
    },

    // Get all handovers
    getAll: async (filters = {}) => {
        const response = await apiClient.get('/api/handovers', { params: filters })
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
