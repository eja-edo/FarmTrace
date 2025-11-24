import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { Package, Loader } from 'lucide-react'
import { productApi } from '../../lib/api'
import { useOrgStore } from '../../store'

export default function CreateProduct() {
  const navigate = useNavigate()
  const { orgName } = useOrgStore()
  const [formData, setFormData] = useState({
    productID: '',
    productName: '',
    description: '',
    quantity: '',
    manufacturer: orgName,
  })

  const createMutation = useMutation(
    (data) => productApi.create(data),
    {
      onSuccess: (response) => {
        toast.success('Product created successfully!')
        navigate(`/products/${response.data.productID}`)
      },
      onError: (error) => {
        console.error('Create product error:', error)
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.productID || !formData.productName || !formData.quantity) {
      toast.error('Please fill in all required fields')
      return
    }

    createMutation.mutate({
      productID: formData.productID,
      productName: formData.productName,
      description: formData.description,
      quantity: parseInt(formData.quantity),
      manufacturer: orgName,
    })
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/products')}
          className="text-manufacturer hover:underline mb-4"
        >
          ← Back to Products
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
        <p className="text-gray-600 mt-1">
          Add a new product to the supply chain
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-200">
          <div className="flex items-center justify-center w-12 h-12 bg-manufacturer/10 rounded-xl">
            <Package className="w-6 h-6 text-manufacturer" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Product Information</h2>
            <p className="text-sm text-gray-600">Enter the details of the product</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="productID"
              value={formData.productID}
              onChange={handleChange}
              placeholder="e.g., PROD001"
              className="input"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for the product
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              placeholder="e.g., Organic Rice"
              className="input"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter product description..."
            rows={4}
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="e.g., 1000"
              min="1"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manufacturer
            </label>
            <input
              type="text"
              value={orgName}
              disabled
              className="input bg-gray-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn btn-secondary"
            disabled={createMutation.isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
            disabled={createMutation.isLoading}
          >
            {createMutation.isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                Create Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
