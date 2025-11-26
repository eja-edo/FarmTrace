import React from 'react'
import { useQuery } from 'react-query'
import {
    Warehouse as WarehouseIcon,
    Package,
    ArrowRightLeft,
    CheckCircle,
    Eye,
    Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { productApi, handoverApi } from '../../lib/api'
import { useOrgStore } from '../../store'

export default function WarehouseDashboard() {
    const { orgName } = useOrgStore()

    const { data: productsResponse, isLoading: loadingInventory } = useQuery(
        ['products', 'warehouse'],
        () => productApi.getAll()
    )

    const { data: pendingHandoversResponse } = useQuery(
        ['handovers', 'warehouse', 'pending'],
        () => handoverApi.getPending()
    )

    const products = productsResponse?.data || []
    const inventory = products.filter((product) => product.owner === 'Warehouse')
    const pendingHandovers = pendingHandoversResponse?.data || []
    const inboundHandovers = pendingHandovers.filter((handover) => handover.toOrg === 'Warehouse')
    const outboundHandovers = pendingHandovers.filter((handover) => handover.fromOrg === 'Warehouse')

    const stats = [
        {
            title: 'Total Inventory',
            value: inventory.length,
            icon: Package,
            color: 'warehouse',
            bgColor: 'bg-warehouse/10',
            textColor: 'text-warehouse',
        },
        {
            title: 'Pending Receiving',
            value: inboundHandovers.length,
            icon: Clock,
            color: 'yellow-500',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-600',
        },
        {
            title: 'Received Today',
            value: inventory.filter(p => {
                if (!p.updatedAt) return false
                const today = new Date().toDateString()
                return new Date(p.updatedAt).toDateString() === today
            }).length,
            icon: CheckCircle,
            color: 'green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: 'Outbound Requests',
            value: outboundHandovers.length,
            icon: ArrowRightLeft,
            color: 'blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
    ]

    const getProductId = (product) => product.id || product.productID || product.productId
    const getHandoverId = (handover) => handover.id || handover.handoverID || handover.handoverId

    return (
        <div className="space-y-6">
            {/* Welcome header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome, {orgName}
                </h1>
                <p className="text-gray-600 mt-1">
                    Manage your inventory and receiving operations
                </p>
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

            {/* Products awaiting receiving */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-yellow-600" />
                        Products Awaiting Receiving
                    </h2>
                    <Link to="/handovers" className="text-warehouse hover:underline font-medium">
                        View All
                    </Link>
                </div>

                {inboundHandovers.length > 0 ? (
                    <div className="space-y-3">
                        {inboundHandovers.map((handover) => {
                            const handoverId = getHandoverId(handover)
                            return (
                                <div
                                    key={handoverId}
                                    className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg">
                                            <ArrowRightLeft className="w-6 h-6 text-yellow-700" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                Product: {handover.productId || handover.productID}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                From: {handover.fromOrg}
                                            </p>
                                            {handover.metadata?.warehouseId && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Warehouse ID: {handover.metadata.warehouseId}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        to={`/handovers/${handoverId}`}
                                        className="btn btn-primary"
                                    >
                                        Confirm Receipt
                                    </Link>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No products awaiting receiving</p>
                    </div>
                )}
            </div>

            {/* Current inventory */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Current Inventory</h2>
                    <Link to="/products" className="text-warehouse hover:underline font-medium">
                        View All
                    </Link>
                </div>

                {loadingInventory ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton h-20 rounded-lg" />
                        ))}
                    </div>
                ) : inventory.length > 0 ? (
                    <div className="space-y-3">
                        {inventory.slice(0, 5).map((product) => {
                            const productId = getProductId(product)
                            return (
                                <div
                                    key={productId}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-12 h-12 bg-warehouse/10 rounded-lg">
                                            <Package className="w-6 h-6 text-warehouse" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {product.name || product.productName}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                ID: {productId}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="badge badge-accepted">
                                            In Stock
                                        </span>
                                        <Link
                                            to={`/products/${productId}`}
                                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-5 h-5 text-gray-600" />
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <WarehouseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No inventory yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}
