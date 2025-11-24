import React from 'react'
import { useQuery } from 'react-query'
import {
    Package,
    ArrowRightLeft,
    TrendingUp,
    AlertCircle,
    Plus,
    Eye,
    Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { productApi, handoverApi } from '../../lib/api'
import { useOrgStore } from '../../store'

export default function ManufacturerDashboard() {
    const { orgName } = useOrgStore()

    // Fetch products
    const { data: products, isLoading: loadingProducts } = useQuery(
        ['products', 'manufacturer'],
        () => productApi.getAll({ owner: 'Manufacturer' })
    )

    // Fetch pending handovers
    const { data: handovers, isLoading: loadingHandovers } = useQuery(
        ['handovers', 'manufacturer'],
        () => handoverApi.getPending('Manufacturer')
    )

    const stats = [
        {
            title: 'Total Products',
            value: products?.data?.length || 0,
            icon: Package,
            color: 'manufacturer',
            bgColor: 'bg-manufacturer/10',
            textColor: 'text-manufacturer',
        },
        {
            title: 'Pending Handovers',
            value: handovers?.data?.filter(h => h.status === 'PENDING').length || 0,
            icon: Clock,
            color: 'yellow-500',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-600',
        },
        {
            title: 'Completed Handovers',
            value: handovers?.data?.filter(h => h.status === 'ACCEPTED').length || 0,
            icon: TrendingUp,
            color: 'green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: 'Failed Handovers',
            value: handovers?.data?.filter(h => h.status === 'REJECTED').length || 0,
            icon: AlertCircle,
            color: 'red-500',
            bgColor: 'bg-red-50',
            textColor: 'text-red-600',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Welcome header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome, {orgName}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Manage your products and supply chain handovers
                    </p>
                </div>
                <Link
                    to="/products/create"
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Create Product
                </Link>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.title} className="card">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">
                                        {stat.title}
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Recent products */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Recent Products</h2>
                    <Link to="/products" className="text-manufacturer hover:underline font-medium">
                        View All
                    </Link>
                </div>

                {loadingProducts ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton h-20 rounded-lg" />
                        ))}
                    </div>
                ) : products?.data?.length > 0 ? (
                    <div className="space-y-3">
                        {products.data.slice(0, 5).map((product) => (
                            <div
                                key={product.productID}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-12 h-12 bg-manufacturer/10 rounded-lg">
                                        <Package className="w-6 h-6 text-manufacturer" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {product.productName}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            ID: {product.productID}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`badge ${product.status === 'InTransit' ? 'badge-intransit' :
                                            product.status === 'Received' ? 'badge-accepted' :
                                                'badge-pending'
                                        }`}>
                                        {product.status}
                                    </span>
                                    <Link
                                        to={`/products/${product.productID}`}
                                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <Eye className="w-5 h-5 text-gray-600" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">No products yet</p>
                        <Link to="/products/create" className="btn btn-primary">
                            Create Your First Product
                        </Link>
                    </div>
                )}
            </div>

            {/* Pending handovers requiring response */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Pending Handovers</h2>
                    <Link to="/handovers" className="text-manufacturer hover:underline font-medium">
                        View All
                    </Link>
                </div>

                {loadingHandovers ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="skeleton h-20 rounded-lg" />
                        ))}
                    </div>
                ) : handovers?.data?.filter(h => h.status === 'PENDING').length > 0 ? (
                    <div className="space-y-3">
                        {handovers.data
                            .filter(h => h.status === 'PENDING')
                            .slice(0, 5)
                            .map((handover) => (
                                <div
                                    key={handover.handoverID}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-12 h-12 bg-yellow-50 rounded-lg">
                                            <ArrowRightLeft className="w-6 h-6 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {handover.productID}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                To: {handover.toOrg}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="badge badge-pending">
                                            Pending
                                        </span>
                                        <Link
                                            to={`/handovers/${handover.handoverID}`}
                                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-5 h-5 text-gray-600" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No pending handovers</p>
                    </div>
                )}
            </div>
        </div>
    )
}
