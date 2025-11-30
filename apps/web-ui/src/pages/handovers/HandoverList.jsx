import React, { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
    ArrowRightLeft,
    Search,
    Filter,
    Eye,
    Clock,
    CheckCircle,
    RefreshCcw,
    Info
} from 'lucide-react'
import { format } from 'date-fns'
import { handoverApi } from '../../lib/api'
import { useOrgStore } from '../../store'

const getHandoverId = (handover) => handover.id || handover.handoverID || handover.handoverId
const getProductId = (handover) => handover.productId || handover.productID

export default function HandoverList() {
    const { selectedOrg, orgName } = useOrgStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [lookupId, setLookupId] = useState('')

    const {
        data: pendingData,
        isLoading,
        isFetching,
        refetch
    } = useQuery(
        ['handovers', 'pending', selectedOrg],
        () => handoverApi.getPending(),
        {
            enabled: !!selectedOrg
        }
    )

    const lookupMutation = useMutation(
        (id) => handoverApi.getById(id),
        {
            enabled: !!pendingData
        }
    )

    const handleLookup = (e) => {
        e.preventDefault()
        if (!lookupId.trim()) {
            toast.error('Enter a handover ID to look up')
            return
        }
        lookupMutation.mutate(lookupId.trim())
    }

    const pendingHandovers = pendingData?.data || []

    const filteredHandovers = useMemo(() => {
        if (!searchTerm) return pendingHandovers
        const lower = searchTerm.toLowerCase()
        return pendingHandovers.filter((handover) => {
            const id = getHandoverId(handover)?.toLowerCase() || ''
            const productId = getProductId(handover)?.toLowerCase() || ''
            return id.includes(lower) || productId.includes(lower)
        })
    }, [pendingHandovers, searchTerm])

    const actionableCount = pendingHandovers.filter(
        (handover) => handover.toOrg?.toLowerCase() === orgName?.toLowerCase()
    ).length

    const expiringSoonCount = pendingHandovers.filter((handover) => {
        if (!handover.expiresAt) return false
        try {
            return new Date(handover.expiresAt) < new Date(Date.now() + 4 * 60 * 60 * 1000)
        } catch {
            return false
        }
    }).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Handovers</h1>
                    <p className="text-gray-600 mt-1">
                        Gateway auto-signs each step — focus on reviewing the business payload.
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="btn btn-secondary flex items-center gap-2"
                    disabled={isFetching}
                >
                    <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                    <p className="text-sm text-gray-600">Pending for {orgName || '...'} </p>
                    <p className="text-3xl font-bold text-gray-900">{pendingHandovers.length}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-600">Action needed (You are recipient)</p>
                    <p className="text-3xl font-bold text-gray-900">{actionableCount}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-600">Expiring in &lt; 4 hours</p>
                    <p className="text-3xl font-bold text-gray-900">{expiringSoonCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by handover ID or product ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setSearchTerm('')}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Filter className="w-5 h-5" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Pending list */}
            <div className="card">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="skeleton h-24 rounded-lg" />
                        ))}
                    </div>
                ) : filteredHandovers.length > 0 ? (
                    <div className="space-y-3">
                        {filteredHandovers.map((handover) => {
                            const handoverIdValue = getHandoverId(handover)
                            const productId = getProductId(handover)
                            const isRecipient = handover.toOrg?.toLowerCase() === orgName?.toLowerCase()
                            return (
                                <div
                                    key={handoverIdValue}
                                    className={`p-4 rounded-lg border-2 transition-all ${isRecipient
                                        ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
                                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-100">
                                                <Clock className="w-5 h-5 text-yellow-700" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {productId}
                                                    </h3>
                                                    <span className="badge badge-pending">
                                                        {handover.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <span className="font-medium">{handover.fromOrg}</span>
                                                    <ArrowRightLeft className="w-4 h-4" />
                                                    <span className="font-medium">{handover.toOrg}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                                                    {handover.metadata?.waybill && (
                                                        <span>Waybill: {handover.metadata.waybill}</span>
                                                    )}
                                                    {handover.requestedAt && (
                                                        <span>
                                                            Requested: {format(new Date(handover.requestedAt), 'MMM dd, yyyy HH:mm')}
                                                        </span>
                                                    )}
                                                    {handover.expiresAt && (
                                                        <span>
                                                            Expires: {format(new Date(handover.expiresAt), 'MMM dd, yyyy HH:mm')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/handovers/${handoverIdValue}`}
                                            className={`btn ${isRecipient ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
                                        >
                                            {isRecipient ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    Review
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </>
                                            )}
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">No pending handovers</p>
                        <p className="text-sm text-gray-500">
                            Initiate a new request from the manufacturer or shipper dashboard to see items here.
                        </p>
                    </div>
                )}
            </div>

            {/* Lookup by ID */}
            <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary-600" />
                    Lookup specific handover
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    Need to inspect a completed or historical handover? Fetch it directly by ID — the gateway will return the full record,
                    including nonce, metadata, and audit timestamps.
                </p>
                <form onSubmit={handleLookup} className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        value={lookupId}
                        onChange={(e) => setLookupId(e.target.value)}
                        placeholder="Enter HANDOVER-xxx identifier"
                        className="input flex-1"
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={lookupMutation.isLoading}
                    >
                        {lookupMutation.isLoading ? 'Fetching...' : 'Fetch details'}
                    </button>
                </form>

                {lookupMutation.data?.data && (
                    <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Handover ID</p>
                                <p className="font-semibold text-gray-900">
                                    {getHandoverId(lookupMutation.data.data)}
                                </p>
                            </div>
                            <Link
                                to={`/handovers/${getHandoverId(lookupMutation.data.data)}`}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                Open
                            </Link>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                            Status: <span className="font-medium text-gray-900">{lookupMutation.data.data.status}</span>
                        </p>
                        {lookupMutation.data.data.metadata && (
                            <p className="text-xs text-gray-500 mt-2">
                                Metadata: {JSON.stringify(lookupMutation.data.data.metadata)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
