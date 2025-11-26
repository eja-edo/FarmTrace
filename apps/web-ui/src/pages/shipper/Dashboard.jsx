import React from 'react'
import { useQuery } from 'react-query'
import {
    Truck,
    ArrowRightLeft,
    CheckCircle,
    Package,
    Eye,
    Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { handoverApi, productApi } from '../../lib/api'
import { useOrgStore } from '../../store'

export default function ShipperDashboard() {
    const { orgName } = useOrgStore()

    const { data: pendingHandoversResponse, isLoading: loadingPending } = useQuery(
        ['handovers', 'shipper', 'pending'],
        () => handoverApi.getPending()
    )

    const { data: productsResponse } = useQuery(
        ['products', 'shipper'],
        () => productApi.getAll()
    )

    const pendingHandovers = pendingHandoversResponse?.data || []
    const shipperPending = pendingHandovers.filter((handover) => handover.toOrg === 'Shipper')
    const shipperOutbound = pendingHandovers.filter((handover) => handover.fromOrg === 'Shipper')
    const products = productsResponse?.data || []
    const shipperOwned = products.filter((product) => product.owner === 'Shipper')
    const inTransitProducts = products.filter((product) => product.status === 'InTransit')
    const getHandoverId = (handover) => handover.id || handover.handoverID || handover.handoverId
    const getProductId = (item) => item.productId || item.productID
    const getInventoryProductId = (product) => product.id || product.productID || product.productId

    const stats = [
        {
            title: 'Pending Approval',
            value: shipperPending.length,
            icon: Clock,
            color: 'yellow-500',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-600',
        },
        {
            title: 'Owned by Shipper',
            value: shipperOwned.length,
            icon: Truck,
            color: 'shipper',
            bgColor: 'bg-shipper/10',
            textColor: 'text-shipper',
        },
        {
            title: 'In Transit',
            value: inTransitProducts.length,
            icon: ArrowRightLeft,
            color: 'blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: 'Requests to Warehouse',
            value: shipperOutbound.length,
            icon: CheckCircle,
            color: 'green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Welcome header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome, {orgName}
                </h1>
                <p className="text-gray-600 mt-1">
                    Manage handover approvals and shipments
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

            {/* Handovers requiring approval */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-yellow-600" />
                        Handovers Requiring Your Approval
                    </h2>
                    <Link to="/handovers" className="text-shipper hover:underline font-medium">
                        View All
                    </Link>
                </div>

                {loadingPending ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton h-24 rounded-lg" />
                        ))}
                    </div>
                ) : shipperPending.length > 0 ? (
                    <div className="space-y-3">
                        {shipperPending.map((handover) => {
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
                                                Product: {getProductId(handover)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                From: {handover.fromOrg} → To: {handover.toOrg}
                                            </p>
                                            {handover.metadata?.waybill && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Waybill: {handover.metadata.waybill}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        to={`/handovers/${handoverId}`}
                                        className="btn btn-primary"
                                    >
                                        Review & Approve
                                    </Link>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No pending handovers requiring approval</p>
                    </div>
                )}
            </div>

            {/* Active shipments */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Active Shipments</h2>
                    <Link to="/products" className="text-shipper hover:underline font-medium">
                        View All
                    </Link>
                </div>

                {inTransitProducts.length > 0 ? (
                    <div className="space-y-3">
                        {inTransitProducts.slice(0, 5).map((product) => {
                            const productId = getInventoryProductId(product)
                            return (
                                <div
                                    key={productId}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-12 h-12 bg-shipper/10 rounded-lg">
                                            <Package className="w-6 h-6 text-shipper" />
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
                                        <span className="badge badge-intransit">
                                            In Transit
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
                        <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No active shipments</p>
                    </div>
                )}
            </div>
        </div>
    )
}
