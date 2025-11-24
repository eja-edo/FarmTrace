import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { 
  ArrowRightLeft, 
  Search, 
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { handoverApi } from '../../lib/api'
import { useOrgStore } from '../../store'

export default function HandoverList() {
  const { selectedOrg, orgName } = useOrgStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Fetch pending handovers for this organization
  const { data: pendingData } = useQuery(
    ['handovers', selectedOrg, 'pending'],
    () => handoverApi.getPending(orgName)
  )

  // Fetch all handovers involving this organization
  const { data: allData, isLoading } = useQuery(
    ['handovers', selectedOrg, 'all'],
    () => handoverApi.getAll({ organization: orgName })
  )

  const allHandovers = allData?.data || []
  
  const filteredHandovers = allHandovers.filter((handover) => {
    const matchesSearch = searchTerm
      ? handover.productID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        handover.handoverID.toLowerCase().includes(searchTerm.toLowerCase())
      : true

    const matchesStatus = statusFilter
      ? handover.status === statusFilter
      : true

    return matchesSearch && matchesStatus
  })

  const pendingCount = allHandovers.filter(h => h.status === 'PENDING').length
  const acceptedCount = allHandovers.filter(h => h.status === 'ACCEPTED').length
  const rejectedCount = allHandovers.filter(h => h.status === 'REJECTED').length

  const statusOptions = [
    { value: '', label: 'All Status', count: allHandovers.length },
    { value: 'PENDING', label: 'Pending', count: pendingCount },
    { value: 'ACCEPTED', label: 'Accepted', count: acceptedCount },
    { value: 'REJECTED', label: 'Rejected', count: rejectedCount },
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'ACCEPTED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <ArrowRightLeft className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return 'badge-pending'
      case 'ACCEPTED':
        return 'badge-accepted'
      case 'REJECTED':
        return 'badge-rejected'
      default:
        return 'badge-pending'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Handovers</h1>
        <p className="text-gray-600 mt-1">
          Manage product handovers in the supply chain
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statusOptions.map((option) => (
          <div
            key={option.value}
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setStatusFilter(option.value)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{option.label}</p>
                <p className="text-2xl font-bold text-gray-900">{option.count}</p>
              </div>
              {option.value && (
                <div className={`p-2 rounded-lg ${
                  option.value === 'PENDING' ? 'bg-yellow-50' :
                  option.value === 'ACCEPTED' ? 'bg-green-50' :
                  'bg-red-50'
                }`}>
                  {getStatusIcon(option.value)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product ID or handover ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('')
            }}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Filter className="w-5 h-5" />
            Reset
          </button>
        </div>
      </div>

      {/* Handover list */}
      <div className="card">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
        ) : filteredHandovers.length > 0 ? (
          <div className="space-y-3">
            {filteredHandovers.map((handover) => (
              <div
                key={handover.handoverID}
                className={`p-4 rounded-lg border-2 transition-all ${
                  handover.status === 'PENDING' && 
                  (handover.toOrg === orgName)
                    ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                      handover.status === 'PENDING' ? 'bg-yellow-100' :
                      handover.status === 'ACCEPTED' ? 'bg-green-100' :
                      'bg-red-100'
                    }`}>
                      {getStatusIcon(handover.status)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {handover.productID}
                        </h3>
                        <span className={`badge ${getStatusBadge(handover.status)}`}>
                          {handover.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">{handover.fromOrg}</span>
                        <ArrowRightLeft className="w-4 h-4" />
                        <span className="font-medium">{handover.toOrg}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Waybill: {handover.waybillNumber}</span>
                        <span>•</span>
                        <span>{format(new Date(handover.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/handovers/${handover.handoverID}`}
                    className={`btn ${
                      handover.status === 'PENDING' && handover.toOrg === orgName
                        ? 'btn-primary'
                        : 'btn-secondary'
                    } flex items-center gap-2`}
                  >
                    {handover.status === 'PENDING' && handover.toOrg === orgName ? (
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
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No handovers found</p>
            <p className="text-sm text-gray-500">
              {searchTerm || statusFilter
                ? 'Try adjusting your filters'
                : 'Handovers will appear here once initiated'}
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredHandovers.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Showing <span className="font-medium text-gray-900">{filteredHandovers.length}</span> handovers
          </p>
        </div>
      )}
    </div>
  )
}
