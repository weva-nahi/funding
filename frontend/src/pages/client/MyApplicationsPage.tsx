import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { FileText, ChevronRight } from 'lucide-react'
import type { Application, Paginated } from '@/types'

export function MyApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery<Paginated<Application>>({
    queryKey: ['my-applications', statusFilter, page],
    queryFn: () => api.get('/applications/', {
      params: { status: statusFilter || undefined, page }
    }).then(r => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
        <p className="text-muted-foreground mt-1">Track and manage your funding applications</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setStatusFilter(''); setPage(1) }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!statusFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
          All
        </button>
        {APPLICATION_STATUSES.map(s => (
          <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1) }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${statusFilter === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : isError ? (
        <div className="text-center py-12 text-red-600">Failed to load applications.</div>
      ) : (data?.results?.length ?? 0) === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-3 opacity-30" />
          <p>No applications found.</p>
          <Link to="/opportunities" className="mt-2 inline-block text-primary hover:underline">Browse opportunities →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.results?.map((app) => {
            const statusConfig = APPLICATION_STATUSES.find(s => s.value === app.status)
            return (
              <Link key={app.id} to={`/applications/${app.id}`}
                className="flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex-1">
                  <p className="font-semibold">{app.opportunity_title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{app.opportunity_source}</span>
                    <span>·</span>
                    <span>{formatDate(app.created_at)}</span>
                    <span>·</span>
                    <span>v{app.version}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusConfig?.color}`}>
                    {statusConfig?.label || app.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {(data?.count ?? 0) > 0 && (
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted">Previous</button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!data?.next}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted">Next</button>
        </div>
      )}
    </div>
  )
}