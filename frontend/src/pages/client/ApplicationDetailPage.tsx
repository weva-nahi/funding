import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/axios'
import { formatDate, formatRelativeDate } from '@/utils/formatDate'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { ArrowLeft, Download, Clock, User, MessageSquare } from 'lucide-react'

export function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}/`).then(r => r.data),
  })

  const { data: docs } = useQuery({
    queryKey: ['app-documents', id],
    queryFn: () => api.get(`/documents/application/${id}/`).then(r => r.data),
    enabled: !!id,
  })

  const withdrawMutation = useMutation({
    mutationFn: () => api.post(`/applications/${id}/withdraw/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['application', id] }),
  })

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>

  const statusConfig = APPLICATION_STATUSES.find(s => s.value === app.status)

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="p-8 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{app.opportunity_title}</h1>
              <p className="text-sm text-muted-foreground mt-1">Application #{app.id} · Version {app.version}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusConfig?.color}`}>{statusConfig?.label || app.status}</span>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Motivation */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Motivation Letter</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-4">{app.motivation_letter || 'Not provided.'}</p>
          </div>

          {/* Admin comment */}
          {app.admin_comment && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <h3 className="text-sm font-semibold text-emerald-800 mb-1">Admin Comment</h3>
              <p className="text-sm text-emerald-700">{app.admin_comment}</p>
            </div>
          )}

          {/* Rejection reason */}
          {app.rejection_reason && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <h3 className="text-sm font-semibold text-red-800 mb-1">Rejection Reason</h3>
              <p className="text-sm text-red-700">{app.rejection_reason}</p>
            </div>
          )}

          {/* Documents */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Documents ({docs?.length || 0})</h3>
            {docs?.length > 0 ? (
              <div className="space-y-2">
                {docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{doc.original_filename}</span>
                    <a href={`${import.meta.env.VITE_API_URL || ''}/api/v1/documents/${doc.id}/download/`}
                      className="text-primary hover:underline text-sm flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No documents attached.</p>}
          </div>

          {/* Timeline */}
          {app.status_history?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Timeline</h3>
              <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                {app.status_history.map((entry: any) => (
                  <div key={entry.id} className="flex gap-4 relative">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center z-10 mt-0.5">
                      <Clock className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{entry.from_status ? `${entry.from_status} → ${entry.to_status}` : entry.to_status}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeDate(entry.created_at)}{entry.changed_by_email ? ` · ${entry.changed_by_email}` : ''}</p>
                      {entry.comment && <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2">{entry.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {['draft', 'pending', 'in_review'].includes(app.status) && (
            <div className="pt-4 border-t">
              <button onClick={() => { if (confirm('Withdraw this application?')) withdrawMutation.mutate() }}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Withdraw Application
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
