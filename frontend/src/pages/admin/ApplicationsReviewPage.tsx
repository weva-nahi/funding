import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { CharCounter } from '@/components/CharCounter'
import { CheckCircle, XCircle, Search, Eye, Star, Layers } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import type { Application, Paginated } from '@/types'

const REASON_MAX_LENGTH = 1000

export function ApplicationsReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const debouncedSearch = useDebounce(search)
  const queryClient = useQueryClient()

  useEffect(() => {
    const urlStatus = searchParams.get('status') || ''
    if (urlStatus !== statusFilter) {
      setStatusFilter(urlStatus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value)
    setPage(1)
    setSelectedIds(new Set())
    const next = new URLSearchParams(searchParams)
    if (value) next.set('status', value)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }

  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'in_review' | 'shortlist' | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  const { data, isLoading, isError } = useQuery<Paginated<Application>>({
    queryKey: ['admin-applications', debouncedSearch, statusFilter, page],
    queryFn: () => api.get('/applications/admin/', {
      params: { search: debouncedSearch || undefined, status: statusFilter || undefined, page }
    }).then(r => r.data),
  })

  const reviewMutation = useMutation({
    mutationFn: (payload: { action: string; comment?: string; reason?: string }) =>
      api.post(`/applications/admin/${selectedApp!.id}/review/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      setSelectedApp(null)
      setReviewAction(null)
      setReviewComment('')
    },
  })

  const bulkShortlistMutation = useMutation({
    mutationFn: (ids: number[]) => api.post('/applications/admin/bulk-shortlist/', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      setSelectedIds(new Set())
    },
  })

  const handleReview = () => {
    if (!reviewAction) return
    const payload: { action: string; comment?: string; reason?: string } = { action: reviewAction }
    if (reviewAction === 'approve' || reviewAction === 'shortlist') payload.comment = reviewComment
    if (reviewAction === 'reject') payload.reason = reviewComment
    reviewMutation.mutate(payload)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const eligible = (data?.results ?? []).filter(a => a.status === 'pending' || a.status === 'in_review')
    if (selectedIds.size === eligible.length && eligible.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(eligible.map(a => a.id)))
    }
  }

  const canShortlist = (s: string) => s === 'pending' || s === 'in_review'

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Applications</h1>
        <p className="text-muted-foreground mt-1">Manage and respond to client applications</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search by email or opportunity..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={statusFilter} onChange={e => updateStatusFilter(e.target.value)}
          className="rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
          <option value="">All Statuses</option>
          {APPLICATION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3">
          <span className="text-sm font-medium text-indigo-800">{selectedIds.size} selected</span>
          <button
            onClick={() => bulkShortlistMutation.mutate(Array.from(selectedIds))}
            disabled={bulkShortlistMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Layers className="h-4 w-4" />
            {bulkShortlistMutation.isPending ? 'Shortlisting...' : 'Shortlist Selected'}
          </button>
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium w-10">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={selectedIds.size > 0 && selectedIds.size === (data?.results ?? []).filter(a => canShortlist(a.status)).length}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 font-medium">Opportunity</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-red-600">Failed to load applications.</td></tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No applications found.</td></tr>
              ) : (
                data?.results?.map((app) => {
                  const statusConfig = APPLICATION_STATUSES.find(s => s.value === app.status)
                  return (
                    <tr key={app.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-4">
                        {canShortlist(app.status) && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(app.id)}
                            onChange={() => toggleSelect(app.id)}
                            className="rounded border-gray-300"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium max-w-[200px] truncate">{app.opportunity_title}</td>
                      <td className="px-6 py-4">{app.user_email}</td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{formatDate(app.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig?.color}`}>
                          {statusConfig?.label || app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <button onClick={() => setSelectedApp(app)}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-sm">
                          <Eye className="h-3.5 w-3.5" /> Review
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(data?.count ?? 0) > 0 && (
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted">Previous</button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!data?.next}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted">Next</button>
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Review Application #{selectedApp.id}</h2>
              <button onClick={() => { setSelectedApp(null); setReviewAction(null) }}
                className="text-muted-foreground hover:bg-muted p-1 rounded text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3 mb-6 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground block">Client:</span><span className="font-medium">{selectedApp.user_email}</span></div>
                <div><span className="text-muted-foreground block">Opportunity:</span><span className="font-medium">{selectedApp.opportunity_title}</span></div>
              </div>
              <div><span className="text-muted-foreground block">Status:</span>
                <span className="font-medium capitalize">{selectedApp.status}</span></div>
            </div>

            {!reviewAction ? (
              <div className="flex flex-col gap-3">
                {(selectedApp.status === 'pending' || selectedApp.status === 'in_review') && (
                  <button onClick={() => setReviewAction('shortlist')}
                    className="w-full rounded-lg bg-indigo-600 text-white py-3 font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Star className="h-5 w-5" /> Shortlist
                  </button>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setReviewAction('approve')}
                    className="flex-1 rounded-lg bg-emerald-600 text-white py-3 font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5" /> Approve
                  </button>
                  <button onClick={() => setReviewAction('reject')}
                    className="flex-1 rounded-lg bg-red-600 text-white py-3 font-semibold hover:bg-red-700 flex items-center justify-center gap-2">
                    <XCircle className="h-5 w-5" /> Reject
                  </button>
                </div>
                {selectedApp.status === 'pending' && (
                  <button onClick={() => setReviewAction('in_review')}
                    className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700">
                    Mark as In Review
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className={`font-semibold ${
                  reviewAction === 'approve' ? 'text-emerald-700' :
                  reviewAction === 'reject' ? 'text-red-700' :
                  reviewAction === 'shortlist' ? 'text-indigo-700' :
                  'text-blue-700'
                }`}>
                  {reviewAction === 'approve' ? 'Approve Application' :
                   reviewAction === 'reject' ? 'Reject Application' :
                   reviewAction === 'shortlist' ? 'Shortlist Application' :
                   'Mark as In Review'}
                </h3>
                {reviewAction !== 'in_review' && (
                  <>
                    <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value.slice(0, REASON_MAX_LENGTH))} rows={4}
                      placeholder={
                        reviewAction === 'approve' ? 'Add a comment (optional)...' :
                        reviewAction === 'shortlist' ? 'Add a note for this finalist (optional)...' :
                        'Provide a reason (min 20 chars required)...'
                      }
                      className="w-full rounded-lg border p-3 text-sm focus:ring-2 focus:ring-primary outline-none" />
                    <div className="flex justify-end -mt-2">
                      <CharCounter current={reviewComment.length} max={REASON_MAX_LENGTH} />
                    </div>
                  </>
                )}
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setReviewAction(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
                  <button onClick={handleReview}
                    disabled={reviewMutation.isPending || (reviewAction === 'reject' && reviewComment.length < 20)}
                    className={`rounded-lg px-6 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                      reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                      reviewAction === 'shortlist' ? 'bg-indigo-600 hover:bg-indigo-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}>
                    {reviewMutation.isPending ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}