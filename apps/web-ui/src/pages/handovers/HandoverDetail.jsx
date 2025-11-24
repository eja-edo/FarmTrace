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
    const [receiverID, setReceiverID] = useState('')
    const [signature, setSignature] = useState('')
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
        if (!receiverID || !signature) {
            toast.error('Please fill in all fields')
            return
        }
        acceptMutation.mutate({
            receiverID,
            signature,
        })
    }

    const handleReject = (e) => {
        e.preventDefault()
        if (!rejectReason || !signature) {
            toast.error('Please fill in all fields')
            return
        }
        rejectMutation.mutate({
            reason: rejectReason,
            signature,
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
    const canApprove = handoverData.status === 'PENDING' && handoverData.toOrg === orgName

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
                            Handover ID: {handoverData.handoverID}
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
                                        to={`/products/${handoverData.productID}`}
                                        className="font-semibold text-primary-600 hover:underline"
                                    >
                                        {handoverData.productID}
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
                                        <p className="font-semibold text-gray-900">{handoverData.waybillNumber}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Shipper ID</p>
                                        <p className="font-semibold text-gray-900">{handoverData.shipperID}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Initiated</p>
                                        <p className="font-semibold text-gray-900">
                                            {format(new Date(handoverData.timestamp), 'MMM dd, yyyy HH:mm:ss')}
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
                                        <p className="text-sm text-gray-600">Accepted by: {handoverData.acceptedBy}</p>
                                        {handoverData.receiverSignature && (
                                            <p className="text-xs font-mono text-gray-600 mt-2">
                                                Signature: {handoverData.receiverSignature}
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
                                        <p className="text-sm text-gray-700 mt-2">
                                            Reason: {handoverData.rejectionReason}
                                        </p>
                                        {handoverData.receiverSignature && (
                                            <p className="text-xs font-mono text-gray-600 mt-2">
                                                Signature: {handoverData.receiverSignature}
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
                            to={`/products/${handoverData.productID}`}
                            className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Package className="w-10 h-10 text-primary-600" />
                                <div>
                                    <p className="font-semibold text-gray-900">{handoverData.productID}</p>
                                    <p className="text-sm text-gray-600">View product details →</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Accept Modal */}
            {showAcceptModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            Accept Handover
                        </h3>
                        <form onSubmit={handleAccept} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Receiver ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={receiverID}
                                    onChange={(e) => setReceiverID(e.target.value)}
                                    placeholder="Enter your receiver ID"
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Digital Signature <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                    placeholder="Enter your signature"
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAcceptModal(false)}
                                    className="btn btn-secondary flex-1"
                                    disabled={acceptMutation.isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success flex-1 flex items-center justify-center gap-2"
                                    disabled={acceptMutation.isLoading}
                                >
                                    {acceptMutation.isLoading ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Accept
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <XCircle className="w-6 h-6 text-red-600" />
                            Reject Handover
                        </h3>
                        <form onSubmit={handleReject} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Explain why you're rejecting this handover"
                                    rows={4}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Digital Signature <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                    placeholder="Enter your signature"
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRejectModal(false)}
                                    className="btn btn-secondary flex-1"
                                    disabled={rejectMutation.isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-danger flex-1 flex items-center justify-center gap-2"
                                    disabled={rejectMutation.isLoading}
                                >
                                    {rejectMutation.isLoading ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5" />
                                            Reject
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
