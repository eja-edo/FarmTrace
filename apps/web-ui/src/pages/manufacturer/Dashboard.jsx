import React, { useState } from 'react'
import { useQuery } from 'react-query'
import {
    Package,
    ArrowRightLeft,
    TrendingUp,
    Plus,
    Eye,
    Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { productApi, handoverApi } from '../../lib/api'
import { useOrgStore } from '../../store'

export default function ManufacturerDashboard() {
    const { orgName } = useOrgStore()

    const { data: productsResponse, isLoading: loadingProducts } = useQuery(
        ['products', 'manufacturer'],
        () => productApi.getAll()
    )

    const { data: pendingHandoversResponse, isLoading: loadingHandovers } = useQuery(
        ['handovers', 'manufacturer', 'pending'],
        () => handoverApi.getPending(),
        {
            enabled: !!productsResponse
        }
    )

    const products = productsResponse?.data || []
    const manufacturerProducts = products.filter((product) => product.owner === 'Manufacturer')
    const pendingHandovers = pendingHandoversResponse?.data || []

    const getProductId = (product) => product.id || product.productID || product.productId
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'InTransit':
            case 'Shipped':
                return 'badge-intransit'
            case 'InWarehouse':
            case 'DeliveredToRetailer':
                return 'badge-accepted'
            case 'Sold':
                return 'badge-completed'
            case 'HandoverFailed':
                return 'badge-rejected'
            default:
                return 'badge-pending'
        }
    }

    const getHandoverId = (handover) => handover.id || handover.handoverID || handover.handoverId

    const stats = [
        {
            title: 'Total Products',
            value: manufacturerProducts.length,
            icon: Package,
            color: 'manufacturer',
            bgColor: 'bg-manufacturer/10',
            textColor: 'text-manufacturer',
        },
        {
            title: 'Ready to Handover',
            value: manufacturerProducts.filter(p => p.status === 'Manufactured').length,
            icon: TrendingUp,
            color: 'green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: 'Pending Handovers',
            value: pendingHandovers.length,
            icon: Clock,
            color: 'yellow-500',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-600',
        },
        {
            title: 'In Transit',
            value: products.filter(p => p.status === 'InTransit').length,
            icon: ArrowRightLeft,
            color: 'blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
    ]

    const [productId, setProductId] = useState('')
    const [shipperId, setShipperId] = useState('')
    const [waybill, setWaybill] = useState('')
    const [response, setResponse] = useState(null)

    const handleRequestHandover = async () => {
        try {
            const result = await handoverApi.requestManufacturerToShipper({
                productId,
                shipperId,
                waybill,
            })
            setResponse(result)
        } catch (error) {
            setResponse(error.response?.data || { success: false, error: error.message })
        }
    }

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
                ) : manufacturerProducts.length > 0 ? (
                    <div className="space-y-3">
                        {manufacturerProducts.slice(0, 5).map((product) => {
                            const productId = getProductId(product)
                            return (
                                <div
                                    key={productId}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-12 h-12 bg-manufacturer/10 rounded-lg">
                                            <Package className="w-6 h-6 text-manufacturer" />
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
                                        <span className={`badge ${getStatusBadgeClass(product.status)}`}>
                                            {product.status}
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
                ) : pendingHandovers.length > 0 ? (
                    <div className="space-y-3">
                        {pendingHandovers.slice(0, 5).map((handover) => {
                            const handoverId = getHandoverId(handover)
                            return (
                                <div
                                    key={handoverId}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-12 h-12 bg-yellow-50 rounded-lg">
                                            <ArrowRightLeft className="w-6 h-6 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {handover.productId || handover.productID}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {handover.fromOrg} → {handover.toOrg}
                                            </p>
                                            {handover.metadata?.waybill && (
                                                <p className="text-xs text-gray-500">Waybill: {handover.metadata.waybill}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="badge badge-pending">
                                            Pending
                                        </span>
                                        <Link
                                            to={`/handovers/${handoverId}`}
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
                        <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No pending handovers</p>
                    </div>
                )}
            </div>

            {/* Request Handover to Shipper */}
            <div className="card">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Request Handover to Shipper</h2>
                    <p className="text-gray-600">
                        Fill in the details below to request a handover to the shipper.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product ID
                        </label>
                        <input
                            type="text"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="input"
                            placeholder="Enter Product ID"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shipper ID
                        </label>
                        <input
                            type="text"
                            value={shipperId}
                            onChange={(e) => setShipperId(e.target.value)}
                            className="input"
                            placeholder="Enter Shipper ID"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Waybill
                        </label>
                        <input
                            type="text"
                            value={waybill}
                            onChange={(e) => setWaybill(e.target.value)}
                            className="input"
                            placeholder="Enter Waybill Number"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <button
                        onClick={handleRequestHandover}
                        className="btn btn-primary"
                    >
                        Request Handover
                    </button>
                </div>

                {response && (
                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Response:
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800">
                            {JSON.stringify(response, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}
