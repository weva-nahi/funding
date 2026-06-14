import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import type { ConsultingRequest, Paginated } from '@/types'

export function ConsultingRequestsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [respondingTo, setRespondingTo] = useState<ConsultingRequest | null>(null)
  const [response, setResponse] = useState('')
  const [action, setAction] = useState<'resolve' | 'reject'>('resolve')

  const { data, isLoading, isError } = useQuery<Paginated<ConsultingRequest>>({
    queryKey: ['admin-consulting-requests', page],
    queryFn: () => api.get('/consulting/admin/', { params: { page } }).then(r => r.data),
  })

  const respondMutation = useMutation({
    mutationFn: () => api.post(`/consulting/admin/${respondingTo!.id}/respond/`, { response, action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consulting-requests'] })
      setRespondingTo(null)
      setResponse('')
    },
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Consulting Requests</h1>
        <p className="text-muted-foreground mt-1">Manage client advisory and support requests</p>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="h-32 rounded-xl border bg-muted animate-pulse" />
        ) : isError ? (
          <div className="text-center p-8 text-red-600 bg-white border rounded-xl">Failed to load requests.</div>
        ) : (data?.results?.length ?? 0) === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-white border rounded-xl">No consulting requests found.</div>
        ) : (
          data?.results?.map((req) => (
            <div key={req.id} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{req.user_email}</h3>
                  {req.company && <p className="text-sm text-muted-foreground">{req.company}</p>}
                  <p className="text-sm text-muted-foreground">Submitted {formatDate(req.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                    req.priority === 'high' ? 'bg-red-100 text-red-700' :
                    req.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{req.priority}</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                    req.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{req.status}</span>
                </div>
              </div>
              <p className="text-sm bg-muted/30 p-4 rounded-lg border">{req.description}</p>
              {req.admin_response && (
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">Your response:</p>
                  <p className="text-sm text-blue-700">{req.admin_response}</p>
                </div>
              )}
              {req.status === 'pending' && (
                <div className="mt-4 flex justify-end">
                  <button onClick={() => setRespondingTo(req)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                    Respond to Request
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {(data?.count ?? 0) > 0 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Previous</button>
          <button onClick={() => setPage(p => p + 1)} disabled={!data?.next} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {respondingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Respond to Request #{respondingTo.id}</h2>
              <button onClick={() => setRespondingTo(null)} className="text-muted-foreground hover:bg-muted p-1 rounded text-lg leading-none">✕</button>
            </div>
            <p className="text-sm text-muted-foreground mb-3 bg-muted/30 p-3 rounded-lg">{respondingTo.description}</p>
            <textarea value={response} onChange={e => setResponse(e.target.value)} rows={4}
              placeholder="Write your response..."
              className="w-full rounded-lg border p-3 text-sm focus:ring-2 focus:ring-primary outline-none mb-3" />
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="action" value="resolve" checked={action === 'resolve'} onChange={() => setAction('resolve')} />
                Resolve
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="action" value="reject" checked={action === 'reject'} onChange={() => setAction('reject')} />
                Reject
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRespondingTo(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => respondMutation.mutate()} disabled={response.length < 5 || respondMutation.isPending}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {respondMutation.isPending ? 'Sending...' : 'Send Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}