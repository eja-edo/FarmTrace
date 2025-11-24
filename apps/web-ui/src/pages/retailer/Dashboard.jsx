import React from 'react'
import { useQuery } from 'react-query'
import { 
  Store, 
  Package, 
  ShoppingCart,
  TrendingUp,
  Eye,
  Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { productApi, handoverApi } from '../../lib/api'
import { useOrgStore } from '../../store'

export default function RetailerDashboard() {
  const { orgName } = useOrgStore()

  // Fetch products owned by retailer
  const { data: inventory, isLoading: loadingInventory } = useQuery(
    ['products', 'retailer'],
    () => productApi.getAll({ owner: 'Retailer' })
  )

  // Fetch pending handovers
  const { data: pendingHandovers } = useQuery(
    ['handovers', 'retailer', 'pending'],
    () => handoverApi.getPending('Retailer')
  )

  // Calculate stats
  const soldProducts = inventory?.data?.filter(p => p.status === 'Sold').length || 0
  const availableProducts = inventory?.data?.filter(p => p.status !== 'Sold').length || 0

  const stats = [
    {
      title: 'Available Products',
      value: availableProducts,
      icon: Package,
      color: 'retailer',
      bgColor: 'bg-retailer/10',
      textColor: 'text-retailer',
    },
    {
      title: 'Pending Receiving',
      value: pendingHandovers?.data?.filter(h => h.status === 'PENDING').length || 0,
      icon: Clock,
      color: 'yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Sold Products',
      value: soldProducts,
      icon: ShoppingCart,
      color: 'green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Inventory',
      value: inventory?.data?.length || 0,
      icon: TrendingUp,
      color: 'blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
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
          Manage your retail inventory and sales
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
      {pendingHandovers?.data?.filter(h => h.status === 'PENDING').length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-yellow-600" />
              Products Awaiting Receipt
            </h2>
            <Link to="/handovers" className="text-retailer hover:underline font-medium">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {pendingHandovers.data
              .filter(h => h.status === 'PENDING')
              .map((handover) => (
                <div
                  key={handover.handoverID}
                  className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg">
                      <Package className="w-6 h-6 text-yellow-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Product: {handover.productID}
                      </p>
                      <p className="text-sm text-gray-600">
                        From: {handover.fromOrg}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/handovers/${handover.handoverID}`}
                    className="btn btn-primary"
                  >
                    Confirm Receipt
                  </Link>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Available inventory */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Available for Sale</h2>
          <Link to="/products" className="text-retailer hover:underline font-medium">
            View All
          </Link>
        </div>

        {loadingInventory ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 rounded-lg" />
            ))}
          </div>
        ) : inventory?.data?.filter(p => p.status !== 'Sold').length > 0 ? (
          <div className="space-y-3">
            {inventory.data
              .filter(p => p.status !== 'Sold')
              .slice(0, 5)
              .map((product) => (
                <div
                  key={product.productID}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-retailer/10 rounded-lg">
                      <Package className="w-6 h-6 text-retailer" />
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
                    <span className="badge badge-accepted">
                      Available
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
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No products available</p>
          </div>
        )}
      </div>

      {/* Recently sold */}
      {soldProducts > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recently Sold</h2>
          </div>

          <div className="space-y-3">
            {inventory.data
              .filter(p => p.status === 'Sold')
              .slice(0, 5)
              .map((product) => (
                <div
                  key={product.productID}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg">
                      <ShoppingCart className="w-6 h-6 text-green-600" />
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
                  <span className="badge badge-completed">
                    Sold
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
