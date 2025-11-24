import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import {
    Package,
    Search,
    Filter,
    Plus,
    Eye,
    Download
} from 'lucide-react'
import { productApi } from '../../lib/api'
import { useOrgStore, useProductFilterStore } from '../../store'

export default function ProductList() {
    const { selectedOrg, orgName } = useOrgStore()
    const { filters, setFilter, resetFilters } = useProductFilterStore()
    const [searchTerm, setSearchTerm] = useState('')

    const { data, isLoading } = useQuery(
        ['products', selectedOrg, filters],
        () => productApi.getAll(filters)
    )

    const filteredProducts = data?.data?.filter((product) => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
            product.productID.toLowerCase().includes(search) ||
            product.productName.toLowerCase().includes(search)
        )
    })

    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'Created', label: 'Created' },
        { value: 'HandoverRequested', label: 'Handover Requested' },
        { value: 'InTransit', label: 'In Transit' },
        { value: 'Received', label: 'Received' },
        { value: 'Sold', label: 'Sold' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-600 mt-1">
                        Manage and track all products in the supply chain
                    </p>
                </div>
                {selectedOrg === 'manufacturer' && (
                    <Link to="/products/create" className="btn btn-primary flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Create Product
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by ID or name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    {/* Status filter */}
                    <div className="w-full md:w-48">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilter('status', e.target.value)}
                            className="input"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reset filters */}
                    <button
                        onClick={() => {
                            resetFilters()
                            setSearchTerm('')
                        }}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Filter className="w-5 h-5" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Product list */}
            <div className="card">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="skeleton h-24 rounded-lg" />
                        ))}
                    </div>
                ) : filteredProducts && filteredProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Product ID</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Quantity</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Owner</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr
                                        key={product.productID}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg">
                                                    <Package className="w-5 h-5 text-primary-600" />
                                                </div>
                                                <span className="font-mono text-sm font-medium text-gray-900">
                                                    {product.productID}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="font-medium text-gray-900">
                                                {product.productName}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-gray-600">
                                                {product.quantity}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-gray-900">
                                                {product.owner}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`badge ${product.status === 'InTransit' ? 'badge-intransit' :
                                                    product.status === 'Received' ? 'badge-accepted' :
                                                        product.status === 'Sold' ? 'badge-completed' :
                                                            product.status === 'HandoverRequested' ? 'badge-pending' :
                                                                'badge-pending'
                                                }`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/products/${product.productID}`}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="w-5 h-5 text-gray-600" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">No products found</p>
                        <p className="text-sm text-gray-500">
                            {searchTerm || filters.status
                                ? 'Try adjusting your filters'
                                : 'Create your first product to get started'}
                        </p>
                    </div>
                )}
            </div>

            {/* Summary */}
            {filteredProducts && filteredProducts.length > 0 && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Showing <span className="font-medium text-gray-900">{filteredProducts.length}</span> products
                    </p>
                </div>
            )}
        </div>
    )
}
