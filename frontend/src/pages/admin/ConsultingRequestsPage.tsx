import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'

export function ConsultingRequestsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-consulting-requests', page],
    queryFn: () => api.get('/consulting/admin/', { params: { page } }).then(r => r.data),
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
        ) : data?.results?.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-white border rounded-xl">No consulting requests found.</div>
        ) : (
          data?.results?.map((req: any) => (
            <div key={req.id} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="font-semibold text-lg">{req.user_email}</h3>
                   <p className="text-sm text-muted-foreground">Submitted {formatDate(req.created_at)}</p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${req.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {req.status}
                </span>
              </div>
              <p className="text-sm bg-muted/30 p-4 rounded-lg border">{req.description}</p>
              
              {req.status === 'open' && (
                <div className="mt-4 flex justify-end">
                   {/* Normally this opens a modal to type a response */}
                   <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Respond to Request</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
