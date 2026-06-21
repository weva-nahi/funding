import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatDate, formatRelativeDate } from '@/utils/formatDate'
import { Eye, X, User, Globe, Monitor, Clock, FileText } from 'lucide-react'
import type { AuditLog, Paginated } from '@/types'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

/** Renders a readable diff between data_before and data_after, showing
 * only fields that actually changed — rather than dumping two raw JSON
 * blobs side by side, which is what "more info but organized" rules out. */
function DataDiff({ before, after }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) {
  const beforeObj = before ?? {}
  const afterObj = after ?? {}
  const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]))

  if (allKeys.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No field-level data recorded for this entry.</p>
  }

  const changedKeys = allKeys.filter(
    (k) => formatFieldValue(beforeObj[k]) !== formatFieldValue(afterObj[k])
  )
  const unchangedCount = allKeys.length - changedKeys.length

  if (changedKeys.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No field changes detected in the recorded data.</p>
  }

  return (
    <div className="space-y-2">
      {changedKeys.map((key) => (
        <div key={key} className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold font-mono">{key}</div>
          <div className="grid grid-cols-2 divide-x text-xs">
            <div className="p-3 bg-red-50/50">
              <p className="text-[10px] font-semibold text-red-600 uppercase mb-1">Before</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-red-800">{formatFieldValue(beforeObj[key])}</pre>
            </div>
            <div className="p-3 bg-emerald-50/50">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-1">After</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-emerald-800">{formatFieldValue(afterObj[key])}</pre>
            </div>
          </div>
        </div>
      ))}
      {unchangedCount > 0 && (
        <p className="text-xs text-muted-foreground">{unchangedCount} other field{unchangedCount !== 1 ? 's' : ''} unchanged.</p>
      )}
    </div>
  )
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery<Paginated<AuditLog>>({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => api.get('/audit/logs/', { params: { page } }).then(r => r.data),
  })

  const { data: detail, isLoading: detailLoading } = useQuery<AuditLog>({
    queryKey: ['admin-audit-log-detail', selectedLogId],
    queryFn: () => api.get(`/audit/logs/${selectedLogId}/`).then(r => r.data),
    enabled: selectedLogId !== null,
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Immutable record of all system modifications — click a row for full details</p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Resource</th>
                <th className="px-6 py-3 font-medium">IP Address</th>
                <th className="px-6 py-3 font-medium text-end">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-red-600">Failed to load audit logs.</td></tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No audit logs found.</td></tr>
              ) : (
                data?.results?.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{formatDate(log.timestamp)}</td>
                    <td className="px-6 py-4 font-medium">{log.user_email ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">{log.model_name}{log.record_id != null ? ` #${log.record_id}` : ''}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{log.ip_address ?? '—'}</td>
                    <td className="px-6 py-4 text-end">
                      <button className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-xs">
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(data?.count ?? 0) > 0 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Previous</button>
          <button onClick={() => setPage(p => p + 1)} disabled={!data?.next} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {selectedLogId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedLogId(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b z-10">
              <h2 className="text-lg font-bold">Audit Log #{selectedLogId}</h2>
              <button onClick={() => setSelectedLogId(null)} className="text-muted-foreground hover:bg-muted p-1.5 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : detail ? (
              <div className="p-6 space-y-6">
                {/* Summary grid — organized at-a-glance facts */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Actor</p>
                      <p className="text-sm font-medium">{detail.user_email ?? 'System / Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Resource</p>
                      <p className="text-sm font-medium">{detail.model_name}{detail.record_id != null ? ` #${detail.record_id}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Timestamp</p>
                      <p className="text-sm font-medium">{formatDate(detail.timestamp)}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeDate(detail.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">IP Address</p>
                      <p className="text-sm font-medium font-mono">{detail.ip_address ?? '—'}</p>
                    </div>
                  </div>
                  {detail.user_agent && (
                    <div className="flex items-start gap-3 col-span-2">
                      <Monitor className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">User Agent</p>
                        <p className="text-xs font-mono text-muted-foreground break-all">{detail.user_agent}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${ACTION_COLORS[detail.action] || 'bg-gray-100 text-gray-700'}`}>
                    {detail.action}
                  </span>
                </div>

                {/* Field-level diff — the "more infos in organized way" ask */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Changes</h3>
                  <DataDiff before={detail.data_before} after={detail.data_after} />
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-red-600">Failed to load details for this entry.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}