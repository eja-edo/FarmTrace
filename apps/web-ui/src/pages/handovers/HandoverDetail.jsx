import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import {
    ArrowRightLeft,
    Package,
    User,
    Calendar,
    FileText,
    CheckCircle,
    XCircle,
    Loader,
    AlertCircle,
    Info
} from 'lucide-react'
import { format } from 'date-fns'
import { handoverApi } from '../../lib/api'
import { useOrgStore } from '../../store'

export default function HandoverDetail() {
    const { handoverId } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { orgName } = useOrgStore()

    const [showAcceptModal, setShowAcceptModal] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [receiverId, setReceiverId] = useState('')
    const [rejectReason, setRejectReason] = useState('')

    const { data: handover, isLoading } = useQuery(
        ['handover', handoverId],
        () => handoverApi.getById(handoverId)
    )

    const acceptMutation = useMutation(
        (data) => handoverApi.accept(handoverId, data),
        {
            onSuccess: () => {
                toast.success('Handover accepted successfully!')
                queryClient.invalidateQueries(['handover', handoverId])
                queryClient.invalidateQueries(['handovers'])
                queryClient.invalidateQueries(['products'])
                setShowAcceptModal(false)
            },
        }
    )

    const rejectMutation = useMutation(
        (data) => handoverApi.reject(handoverId, data),
        {
            onSuccess: () => {
                toast.success('Handover rejected')
                queryClient.invalidateQueries(['handover', handoverId])
                queryClient.invalidateQueries(['handovers'])
                queryClient.invalidateQueries(['products'])
                setShowRejectModal(false)
            },
        }
    )

    const handleAccept = (e) => {
        e.preventDefault()
        if (!receiverId) {
            toast.error('Receiver ID is required')
            return
        }
        acceptMutation.mutate({
            receiverId
        })
    }

    const handleReject = (e) => {
        e.preventDefault()
        if (!rejectReason) {
            toast.error('Rejection reason is required')
            return
        }
        rejectMutation.mutate({
            reason: rejectReason
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        )
    }

    if (!handover?.data) {
        return (
            <div className="text-center py-12">
                <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Handover Not Found</h2>
                <p className="text-gray-600 mb-6">
                    The handover you're looking for doesn't exist.
                </p>
                <button onClick={() => navigate('/handovers')} className="btn btn-primary">
                    Back to Handovers
                </button>
            </div>
        )
    }

    const handoverData = handover.data
    const handoverIdValue = handoverData.id || handoverData.handoverID || handoverData.handoverId || handoverId
    const productIdValue = handoverData.productId || handoverData.productID
    const waybillValue =
        handoverData.metadata?.waybill ||
        handoverData.metadata?.waybillNumber ||
        handoverData.waybill ||
        handoverData.waybillNumber
    const shipperIdValue =
        handoverData.metadata?.shipperId ||
        handoverData.metadata?.shipperID ||
        handoverData.shipperId ||
        handoverData.shipperID
    const expiresAt = handoverData.expiresAt
    const requestedAt = handoverData.requestedAt || handoverData.timestamp || handoverData.createdAt
    const noncePreview = handoverData.nonce || 'NONCE'
    const signatureMessagePreview = `${handoverIdValue}:${noncePreview}:${receiverId || 'RECEIVER'}`
    const canApprove =
        handoverData.status === 'PENDING' &&
        handoverData.toOrg &&
        orgName &&
        handoverData.toOrg.toLowerCase() === orgName.toLowerCase()

    const formatDateSafe = (value) => {
        if (!value) return '—'
        try {
            return format(new Date(value), 'MMM dd, yyyy HH:mm:ss')
        } catch (err) {
            return value
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate('/handovers')}
                    className="text-primary-600 hover:underline mb-4"
                >
                    ← Back to Handovers
                </button>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Handover Details</h1>
                        <p className="text-gray-600 mt-1">
                            Handover ID: {handoverIdValue}
                        </p>
                    </div>
                    <span
                        className={`badge ${handoverData.status === 'PENDING'
                            ? 'badge-pending'
                            : handoverData.status === 'ACCEPTED'
                                ? 'badge-accepted'
                                : 'badge-rejected'
                            }`}
                    >
                        {handoverData.status}
                    </span>
                </div>
            </div>

            {/* Action required banner */}
            {canApprove && (
                <div className="card bg-yellow-50 border-2 border-yellow-200">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-2">Action Required</h3>
                            <p className="text-gray-700 mb-4">
                                This handover requires your approval. Please review the details and accept or reject the handover.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAcceptModal(true)}
                                    className="btn btn-success flex items-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Accept Handover
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="btn btn-danger flex items-center gap-2"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Reject Handover
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Handover info */}
                    <div className="card">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Handover Information</h2>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-12 h-12 bg-primary-50 rounded-lg">
                                    <Package className="w-6 h-6 text-primary-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">Product</p>
                                    <Link
                                        to={`/products/${productIdValue}`}
                                        className="font-semibold text-primary-600 hover:underline"
                                    >
                                        {productIdValue}
                                    </Link>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600 mb-1">From</p>
                                        <p className="font-semibold text-gray-900">{handoverData.fromOrg}</p>
                                    </div>
                                    <ArrowRightLeft className="w-6 h-6 text-gray-400" />
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600 mb-1">To</p>
                                        <p className="font-semibold text-gray-900">{handoverData.toOrg}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Waybill Number</p>
                                        <p className="font-semibold text-gray-900">{waybillValue || '—'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Shipper ID</p>
                                        <p className="font-semibold text-gray-900">{shipperIdValue || '—'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Requested At</p>
                                        <p className="font-semibold text-gray-900">
                                            {formatDateSafe(requestedAt)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Initiated By</p>
                                        <p className="font-semibold text-gray-900">{handoverData.initiatedBy}</p>
                                    </div>
                                </div>
                            </div>

                            {handoverData.initiatorSignature && (
                                <div className="pt-4 border-t border-gray-200">
                                    <p className="text-sm text-gray-600 mb-1">Initiator Signature</p>
                                    <p className="text-xs font-mono text-gray-900 bg-gray-50 p-3 rounded">
                                        {handoverData.initiatorSignature}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status updates */}
                    {(handoverData.acceptedBy || handoverData.rejectionReason) && (
                        <div className="card">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Status Updates</h2>

                            {handoverData.acceptedBy && (
                                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg mb-4">
                                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 mb-1">Handover Accepted</p>
                                        <p className="text-sm text-gray-600">
                                            Accepted by: {handoverData.acceptedBy}
                                        </p>
                                        {handoverData.acceptedAt && (
                                            <p className="text-sm text-gray-600">
                                                Accepted at: {formatDateSafe(handoverData.acceptedAt)}
                                            </p>
                                        )}
                                        {handoverData.toSignature && (
                                            <p className="text-xs font-mono text-gray-600 mt-2 break-all">
                                                Signature: {handoverData.toSignature}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {handoverData.rejectionReason && (
                                <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg">
                                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 mb-1">Handover Rejected</p>
                                        <p className="text-sm text-gray-700">
                                            Reason: {handoverData.rejectionReason}
                                        </p>
                                        {handoverData.rejectedAt && (
                                            <p className="text-sm text-gray-600">
                                                Rejected at: {formatDateSafe(handoverData.rejectedAt)}
                                            </p>
                                        )}
                                        {handoverData.toSignature && (
                                            <p className="text-xs font-mono text-gray-600 mt-2 break-all">
                                                Signature: {handoverData.toSignature}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick actions */}
                    {canApprove && (
                        <div className="card">
                            <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowAcceptModal(true)}
                                    className="btn btn-success w-full flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Accept
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="btn btn-danger w-full flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Reject
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Related product */}
                    <div className="card">
                        <h3 className="font-bold text-gray-900 mb-4">Related Product</h3>
                        <Link
                            to={`/products/${productIdValue}`}
                            className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Package className="w-10 h-10 text-primary-600" />
                                <div>
                                    <p className="font-semibold text-gray-900">{productIdValue}</p>
                                    <p className="text-sm text-gray-600">View product details →</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Accept Modal */}
            {showAcceptModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            Accept Handover
                        </h3>

                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-700 mt-1" />
                            <div>
                                <p className="font-semibold text-blue-900">Auto-signature enabled</p>
                                <p className="text-sm text-blue-800 mt-1">
                                    The gateway queries the nonce, generates the ECDSA signature with your organization's private key,
                                    and submits the blockchain transaction automatically. Provide the receiver ID and we do the rest.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleAccept} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Receiver ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={receiverId}
                                    onChange={(e) => setReceiverId(e.target.value)}
                                    placeholder="e.g., DRIVER-001"
                                    className="input"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Signature message preview:&nbsp;
                                    <code className="font-mono text-[11px] bg-gray-100 px-1 py-0.5 rounded">
                                        {signatureMessagePreview}
                                    </code>
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAcceptModal(false)
                                        setReceiverId('')
                                    }}
                                    className="btn btn-secondary flex-1"
                                    disabled={acceptMutation.isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success flex-1 flex items-center justify-center gap-2"
                                    disabled={acceptMutation.isLoading || !receiverId}
                                >
                                    {acceptMutation.isLoading ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Accept Handover
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <XCircle className="w-6 h-6 text-red-600" />
                            Reject Handover
                        </h3>

                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <Info className="w-5 h-5 text-red-700 mt-1" />
                            <div>
                                <p className="font-semibold text-red-900">No manual signature required</p>
                                <p className="text-sm text-red-800 mt-1">
                                    Provide a clear rejection reason and the gateway will auto-sign the rejection using the nonce from the blockchain.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleReject} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Explain why you're rejecting this handover (e.g., damaged goods, incorrect documentation)"
                                    rows={4}
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRejectModal(false)
                                        setRejectReason('')
                                    }}
                                    className="btn btn-secondary flex-1"
                                    disabled={rejectMutation.isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-danger flex-1 flex items-center justify-center gap-2"
                                    disabled={rejectMutation.isLoading || !rejectReason}
                                >
                                    {rejectMutation.isLoading ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5" />
                                            Reject Handover
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
