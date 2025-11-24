import React from 'react'
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        FarmTrace Supply Chain
                    </h1>
                    <p className="text-gray-600">
                        Blockchain-powered traceability system
                    </p>
                </div>
                <Outlet />
            </div>
        </div>
    )
}
