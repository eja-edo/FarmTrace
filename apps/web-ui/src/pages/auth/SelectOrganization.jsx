import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Factory,
    Truck,
    Warehouse,
    Store,
    ArrowRight
} from 'lucide-react'
import { useOrgStore } from '../../store'

const organizations = [
    {
        id: 'manufacturer',
        name: 'Manufacturer',
        description: 'Create products and initiate handovers',
        icon: Factory,
        color: 'manufacturer',
        bgGradient: 'from-green-500 to-green-600',
    },
    {
        id: 'shipper',
        name: 'Shipper',
        description: 'Accept handovers and manage shipments',
        icon: Truck,
        color: 'shipper',
        bgGradient: 'from-blue-500 to-blue-600',
    },
    {
        id: 'warehouse',
        name: 'Warehouse',
        description: 'Receive and store products',
        icon: Warehouse,
        color: 'warehouse',
        bgGradient: 'from-orange-500 to-orange-600',
    },
    {
        id: 'retailer',
        name: 'Retailer',
        description: 'Receive products and sell to customers',
        icon: Store,
        color: 'retailer',
        bgGradient: 'from-purple-500 to-purple-600',
    },
]

export default function SelectOrganization() {
    const navigate = useNavigate()
    const { setOrg } = useOrgStore()

    const handleSelectOrg = (orgId) => {
        setOrg(orgId)
        navigate('/')
    }

    return (
        <div className="card max-w-5xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Select Your Organization
                </h2>
                <p className="text-gray-600">
                    Choose your role in the supply chain
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {organizations.map((org) => {
                    const Icon = org.icon
                    return (
                        <button
                            key={org.id}
                            onClick={() => handleSelectOrg(org.id)}
                            className="group relative overflow-hidden rounded-xl bg-white border-2 border-gray-200 hover:border-transparent hover:shadow-xl transition-all duration-300 p-6 text-left"
                        >
                            {/* Gradient background on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${org.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                            {/* Content */}
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-${org.color}/10 group-hover:bg-white/20 transition-colors`}>
                                        <Icon className={`w-8 h-8 text-${org.color} group-hover:text-white transition-colors`} />
                                    </div>
                                    <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors transform group-hover:translate-x-1" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-2">
                                    {org.name}
                                </h3>

                                <p className="text-gray-600 group-hover:text-white/90 transition-colors">
                                    {org.description}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Supply chain flow visualization */}
            <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-center mb-6">
                    Supply Chain Flow
                </h3>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    {organizations.map((org, index) => (
                        <React.Fragment key={org.id}>
                            <div className="flex flex-col items-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-${org.color}/10`}>
                                    <org.icon className={`w-6 h-6 text-${org.color}`} />
                                </div>
                                <p className="mt-2 text-xs font-medium text-gray-600">
                                    {org.name}
                                </p>
                            </div>
                            {index < organizations.length - 1 && (
                                <ArrowRight className="w-5 h-5 text-gray-400 mt-[-20px]" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    )
}
