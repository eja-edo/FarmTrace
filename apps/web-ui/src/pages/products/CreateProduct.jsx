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
        id: '',
        name: '',
        batch: '',
        origin: '',
        manufactureDate: new Date().toISOString().slice(0, 10),
        metaHash: '',
    })

    const createMutation = useMutation(
        (data) => productApi.create(data),
        {
            onSuccess: (response) => {
                toast.success('Product created successfully on-chain!')
                navigate(`/products/${response.data.id || formData.id}`)
            },
            onError: (error) => {
                console.error('Create product error:', error)
            },
        }
    )

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!formData.id || !formData.name || !formData.batch || !formData.origin || !formData.manufactureDate) {
            toast.error('Please fill in all required fields')
            return
        }

        createMutation.mutate({
            id: formData.id.trim().toUpperCase(),
            name: formData.name.trim(),
            batch: formData.batch.trim(),
            origin: formData.origin.trim(),
            manufactureDate: formData.manufactureDate,
            metaHash: formData.metaHash.trim(),
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
                        <p className="text-sm text-gray-600">
                            Provide manufacturing data—gateway handles Fabric signatures automatically.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="id"
                            value={formData.id}
                            onChange={handleChange}
                            placeholder="e.g., RICE-2025-001"
                            className="input"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Uppercase alphanumeric + hyphen (max 64 chars). Example: PROD-001.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g., Premium Jasmine Rice"
                            className="input"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Batch <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="batch"
                            value={formData.batch}
                            onChange={handleChange}
                            placeholder="e.g., BATCH-2025-11"
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Origin <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="origin"
                            value={formData.origin}
                            onChange={handleChange}
                            placeholder="e.g., An Giang Province"
                            className="input"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Manufacture Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="manufactureDate"
                            value={formData.manufactureDate}
                            onChange={handleChange}
                            className="input"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Format: YYYY-MM-DD (chaincode validation is strict).
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Organization
                        </label>
                        <input
                            type="text"
                            value={orgName || 'Manufacturer'}
                            disabled
                            className="input bg-gray-50"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Metadata Hash (optional)
                    </label>
                    <input
                        type="text"
                        name="metaHash"
                        value={formData.metaHash}
                        onChange={handleChange}
                        placeholder="ipfs://QmHash123..."
                        className="input font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Reference docs stored off-chain (packaging specs, lab results, etc.).
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    ✅ Gateway auto-signs `CreateProduct` with the Manufacturer key. No scripts, no CLI, just submit the form.
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
