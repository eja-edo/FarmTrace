import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Organization store
export const useOrgStore = create(
    persist(
        (set, get) => ({
            selectedOrg: null,
            orgName: null,

            setOrg: (org) => {
                const orgLabelMap = {
                    manufacturer: 'Manufacturer',
                    shipper: 'Shipper',
                    warehouse: 'Warehouse',
                    retailer: 'Retailer',
                }
                const label = orgLabelMap[org] || org

                set({
                    selectedOrg: org,
                    orgName: label
                })

                // Persist both the canonical org slug (used for headers) and the display label
                localStorage.setItem('selectedOrg', org)
                localStorage.setItem('orgLabel', label)
            },

            clearOrg: () => {
                set({ selectedOrg: null, orgName: null })
                localStorage.removeItem('selectedOrg')
                localStorage.removeItem('orgLabel')
            },

            isOrg: (org) => get().selectedOrg === org,
        }),
        {
            name: 'org-storage',
        }
    )
)

// Notification store
export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,

    addNotification: (notification) => {
        const newNotif = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            read: false,
            ...notification,
        }
        set((state) => ({
            notifications: [newNotif, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }))
    },

    markAsRead: (id) => {
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }))
    },

    markAllAsRead: () => {
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
        }))
    },

    clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 })
    },
}))

// UI state store
export const useUIStore = create((set) => ({
    sidebarOpen: true,
    theme: 'light',

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setTheme: (theme) => set({ theme }),
}))

// Product filter store
export const useProductFilterStore = create((set) => ({
    filters: {
        status: '',
        owner: '',
        search: '',
        dateFrom: '',
        dateTo: '',
    },

    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        })),

    setFilters: (filters) => set({ filters }),

    resetFilters: () =>
        set({
            filters: {
                status: '',
                owner: '',
                search: '',
                dateFrom: '',
                dateTo: '',
            },
        }),
}))
