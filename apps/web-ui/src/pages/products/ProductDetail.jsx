import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import {
  Package,
  Calendar,
  User,
  MapPin,
  Hash,
  ArrowRight,
  History,
  QrCode,
  Loader,
} from 'lucide-react'
import QRCode from 'qrcode.react'
import { format } from 'date-fns'
import { productApi } from '../../lib/api'

export default function ProductDetail() {
  const { productId } = useParams()
  const navigate = useNavigate()

  const { data: product, isLoading } = useQuery(
    ['product', productId],
    () => productApi.getById(productId)
  )

  const { data: history } = useQuery(
    ['product-history', productId],
    () => productApi.getHistory(productId),
    { enabled: !!productId }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!product?.data) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-600 mb-6">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <button onClick={() => navigate('/products')} className="btn btn-primary">
          Back to Products
        </button>
      </div>
    )
  }

  const productData = product.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/products')}
          className="text-primary-600 hover:underline mb-4"
        >
          ← Back to Products
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {productData.productName}
            </h1>
            <p className="text-gray-600 mt-1">
              Product ID: {productData.productID}
            </p>
          </div>
          <span
            className={`badge ${
              productData.status === 'InTransit'
                ? 'badge-intransit'
                : productData.status === 'Received'
                ? 'badge-accepted'
                : productData.status === 'Sold'
                ? 'badge-completed'
                : 'badge-pending'
            }`}
          >
            {productData.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product details */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Product Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg flex-shrink-0">
                  <Package className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Product Name</p>
                  <p className="font-semibold text-gray-900">{productData.productName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg flex-shrink-0">
                  <Hash className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantity</p>
                  <p className="font-semibold text-gray-900">{productData.quantity}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg flex-shrink-0">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Owner</p>
                  <p className="font-semibold text-gray-900">{productData.owner}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Manufacturer</p>
                  <p className="font-semibold text-gray-900">{productData.manufacturer}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(productData.timestamp), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>

            {productData.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900">{productData.description}</p>
              </div>
            )}
          </div>

          {/* Approvals history */}
          {productData.approvals && productData.approvals.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <History className="w-6 h-6" />
                Approval History
              </h2>
              <div className="space-y-4">
                {productData.approvals.map((approval, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full flex-shrink-0">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{approval.actor}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {format(new Date(approval.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                      {approval.signature && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Signature: {approval.signature}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockchain history */}
          {history?.data && (
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Blockchain History
              </h2>
              <div className="space-y-4">
                {history.data.map((record, index) => (
                  <div key={index} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:pb-0">
                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary-600 border-2 border-white" />
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {format(new Date(record.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                      <p className="font-medium text-gray-900 mt-1">
                        {record.value?.status || 'Status Update'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Owner: {record.value?.owner}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* QR Code */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code
            </h3>
            <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
              <QRCode
                value={productData.productID}
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-xs text-gray-600 text-center mt-3">
              Scan to view product details
            </p>
          </div>

          {/* Pending handover */}
          {productData.pendingHandover && (
            <div className="card border-2 border-yellow-200 bg-yellow-50">
              <h3 className="font-bold text-gray-900 mb-2">Pending Handover</h3>
              <p className="text-sm text-gray-600 mb-4">
                This product has a pending handover request
              </p>
              <Link
                to={`/handovers/${productData.pendingHandover}`}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                View Handover
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
