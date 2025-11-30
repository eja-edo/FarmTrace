import React, { useState } from 'react'
import {
  Truck,
  FileText,
  User,
  ArrowRight,
  CheckCircle,
  Loader,
  Info,
  AlertCircle,
  Package
} from 'lucide-react'

const RequestHandoverModal = ({ isOpen, onClose, productData, onSuccess }) => {
  const [step, setStep] = useState(1) // 1: Form, 2: Review, 3: Processing, 4: Success
  const [formData, setFormData] = useState({
    shipperId: '',
    waybill: '',
    notes: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  if (!isOpen) return null

  const validateForm = () => {
    const newErrors = {}

    if (!formData.shipperId.trim()) {
      newErrors.shipperId = 'Shipper ID is required'
    } else if (!/^[A-Z0-9-]+$/.test(formData.shipperId)) {
      newErrors.shipperId = 'Only uppercase letters, numbers, and hyphens allowed'
    }

    if (!formData.waybill.trim()) {
      newErrors.waybill = 'Waybill number is required'
    } else if (!/^WB-\d{8}-\d{3}$/.test(formData.waybill)) {
      newErrors.waybill = 'Format: WB-YYYYMMDD-XXX (e.g., WB-20251127-001)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleNext = () => {
    if (validateForm()) {
      setStep(2)
    }
  }

  const handleSubmit = async () => {
    setStep(3)
    setIsSubmitting(true)

    try {
      // Import handoverApi from your api.js
      const { handoverApi } = await import('../../lib/api')

      const response = await handoverApi.requestManufacturerToShipper({
        productId: productData.id,
        shipperId: formData.shipperId.trim().toUpperCase(),
        waybill: formData.waybill.trim().toUpperCase()
      })

      setResult(response)
      setStep(4)

      // Call onSuccess after 2 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess(response)
        handleClose()
      }, 2000)
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create handover request' })
      setStep(2)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setFormData({ shipperId: '', waybill: '', notes: '' })
    setErrors({})
    setResult(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-xl">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Request Handover</h2>
                <p className="text-sm text-gray-500">Transfer to Shipper</p>
              </div>
            </div>
            {step !== 3 && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress steps */}
          <div className="flex items-center justify-between mt-4">
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Review' },
              { num: 3, label: 'Submit' },
              { num: 4, label: 'Complete' }
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold transition-all ${step >= s.num
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                    }`}>
                    {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${step >= s.num ? 'text-green-600' : 'text-gray-400'
                    }`}>
                    {s.label}
                  </p>
                </div>
                {idx < 3 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-all ${step > s.num ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Form */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Product info banner */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Product to transfer</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{productData.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      ID: <span className="font-mono font-semibold">{productData.id}</span>
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Batch: {productData.batch}</span>
                      <span>•</span>
                      <span>Origin: {productData.origin}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info alert */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 mb-1">Auto-signature enabled</p>
                  <p className="text-blue-800">
                    Gateway will automatically sign this request with your Manufacturer key.
                    Just provide the business details below.
                  </p>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-5">
                {/* Shipper ID */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    Shipper ID
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.shipperId}
                    onChange={(e) => handleChange('shipperId', e.target.value.toUpperCase())}
                    placeholder="e.g., SHIPPER-001, DHL-VN-001"
                    className={`w-full px-4 py-3 border-2 rounded-lg font-mono transition-all focus:outline-none focus:ring-2 ${errors.shipperId
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
                      }`}
                  />
                  {errors.shipperId && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.shipperId}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier for the shipping company or driver
                  </p>
                </div>

                {/* Waybill Number */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Waybill Number
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.waybill}
                    onChange={(e) => handleChange('waybill', e.target.value.toUpperCase())}
                    placeholder="WB-20251127-001"
                    className={`w-full px-4 py-3 border-2 rounded-lg font-mono transition-all focus:outline-none focus:ring-2 ${errors.waybill
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
                      }`}
                  />
                  {errors.waybill && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.waybill}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Format: WB-YYYYMMDD-XXX (tracking number for shipment)
                  </p>
                </div>

                {/* Notes (optional) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Additional Notes
                    <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Special instructions, handling requirements, etc."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg transition-all focus:outline-none focus:ring-2 focus:border-green-500 focus:ring-green-200 resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  Review Request
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 mb-1">Review before submitting</p>
                    <p className="text-sm text-amber-800">
                      This will create a blockchain transaction and notify the shipper.
                      Please verify all details are correct.
                    </p>
                  </div>
                </div>
              </div>

              {/* Review details */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg mb-4">Handover Summary</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">From</p>
                    <p className="text-base font-semibold text-gray-900">Manufacturer</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">To</p>
                    <p className="text-base font-semibold text-gray-900">Shipper</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Product</p>
                  <p className="font-semibold text-gray-900">{productData.name}</p>
                  <p className="text-sm text-gray-600 font-mono mt-1">{productData.id}</p>
                </div>

                <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Shipper ID</p>
                    <p className="font-mono font-semibold text-gray-900">{formData.shipperId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Waybill</p>
                    <p className="font-mono font-semibold text-gray-900">{formData.waybill}</p>
                  </div>
                </div>

                {formData.notes && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{formData.notes}</p>
                  </div>
                )}
              </div>

              {/* What happens next */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-2 text-sm">What happens next:</p>
                <ol className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>Gateway signs request with your Manufacturer private key</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Transaction submitted to blockchain (immutable record)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Shipper receives notification to review handover</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">4.</span>
                    <span>Product status changes to "HandoverRequested"</span>
                  </li>
                </ol>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.submit}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  ← Back to Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Submit Request
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 3 && (
            <div className="py-12 text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-green-200 rounded-full animate-pulse"></div>
                  <Loader className="w-20 h-20 text-green-600 animate-spin absolute inset-0" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Request...</h3>
              <p className="text-gray-600 mb-6">
                Gateway is signing and submitting to blockchain
              </p>
              <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-4 text-left">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Validating request data</span>
                  </div>
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Generating ECDSA signature</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Loader className="w-4 h-4 flex-shrink-0 animate-spin" />
                    <span>Submitting to Fabric network...</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-4 h-4 flex-shrink-0" />
                    <span>Waiting for confirmation</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && result && (
            <div className="py-12 text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Handover Requested!</h3>
              <p className="text-gray-600 mb-6">
                The shipper has been notified and can now review your request
              </p>

              <div className="max-w-md mx-auto bg-gray-50 rounded-xl p-6 text-left mb-6">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Handover ID</p>
                <p className="font-mono font-semibold text-gray-900 text-sm bg-white px-3 py-2 rounded border border-gray-200">
                  {result.data.handoverId}
                </p>
              </div>

              <div className="text-sm text-gray-600 mb-8">
                <p>✓ Signed with Manufacturer key</p>
                <p>✓ Recorded on blockchain</p>
                <p>✓ Shipper notified</p>
              </div>

              <p className="text-gray-500 text-sm">
                Closing automatically...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RequestHandoverModal