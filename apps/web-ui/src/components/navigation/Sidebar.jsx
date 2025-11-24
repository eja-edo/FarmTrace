import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
    Home,
    Package,
    ArrowRightLeft,
    Truck,
    Warehouse,
    ShoppingCart,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { useOrgStore, useUIStore } from '../../store'

const orgConfig = {
    manufacturer: {
        name: 'Manufacturer',
        color: 'manufacturer',
        bgColor: 'bg-manufacturer',
        links: [
            { to: '/', label: 'Dashboard', icon: Home },
            { to: '/products', label: 'Products', icon: Package },
            { to: '/handovers', label: 'Handovers', icon: ArrowRightLeft },
        ],
    },
    shipper: {
        name: 'Shipper',
        color: 'shipper',
        bgColor: 'bg-shipper',
        links: [
            { to: '/', label: 'Dashboard', icon: Home },
            { to: '/products', label: 'Products', icon: Package },
            { to: '/handovers', label: 'Handovers', icon: ArrowRightLeft },
            { to: '/shipments', label: 'Shipments', icon: Truck },
        ],
    },
    warehouse: {
        name: 'Warehouse',
        color: 'warehouse',
        bgColor: 'bg-warehouse',
        links: [
            { to: '/', label: 'Dashboard', icon: Home },
            { to: '/products', label: 'Inventory', icon: Warehouse },
            { to: '/handovers', label: 'Handovers', icon: ArrowRightLeft },
        ],
    },
    retailer: {
        name: 'Retailer',
        color: 'retailer',
        bgColor: 'bg-retailer',
        links: [
            { to: '/', label: 'Dashboard', icon: Home },
            { to: '/products', label: 'Products', icon: ShoppingCart },
            { to: '/handovers', label: 'Handovers', icon: ArrowRightLeft },
        ],
    },
}

export default function Sidebar() {
    const navigate = useNavigate()
    const { selectedOrg, clearOrg } = useOrgStore()
    const { sidebarOpen, toggleSidebar } = useUIStore()

    const config = orgConfig[selectedOrg] || orgConfig.manufacturer

    const handleLogout = () => {
        clearOrg()
        navigate('/auth/select-org')
    }

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'
                    } ${config.bgColor} text-white`}
            >
                {/* Logo/Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
                    {sidebarOpen && (
                        <div>
                            <h2 className="font-bold text-lg">{config.name}</h2>
                            <p className="text-xs text-white/70">Supply Chain Portal</p>
                        </div>
                    )}
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-auto"
                    >
                        {sidebarOpen ? (
                            <ChevronLeft className="w-5 h-5" />
                        ) : (
                            <ChevronRight className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {config.links.map((link) => {
                        const Icon = link.icon
                        return (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.to === '/'}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-white/20'
                                        : 'hover:bg-white/10'
                                    }`
                                }
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {sidebarOpen && (
                                    <span className="font-medium">{link.label}</span>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Logout button */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-white/90 hover:text-white"
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span className="font-medium">Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}
