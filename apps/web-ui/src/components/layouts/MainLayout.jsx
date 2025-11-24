import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../navigation/Sidebar'
import Header from '../navigation/Header'
import { useUIStore } from '../../store'

export default function MainLayout() {
    const { sidebarOpen } = useUIStore()

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
                <Header />
                <main className="p-6">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
