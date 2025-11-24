import React from 'react'
import { Bell, Menu, User } from 'lucide-react'
import { useOrgStore, useNotificationStore, useUIStore } from '../../store'

export default function Header() {
    const { orgName } = useOrgStore()
    const { unreadCount } = useNotificationStore()
    const { toggleSidebar } = useUIStore()

    return (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16">
            <div className="flex items-center justify-between h-full px-6">
                {/* Left side */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900">
                        {orgName} Portal
                    </h1>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <Bell className="w-6 h-6 text-gray-600" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* User profile */}
                    <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
                            <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-medium text-gray-900">{orgName}</p>
                            <p className="text-xs text-gray-500">Admin User</p>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    )
}
