import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { X, Shield, User, Clock, Globe, Activity } from 'lucide-react'
import type { AuditLog, Paginated } from '@/types'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
}

const MODEL_LABELS: Record<string, string> = {
  opportunities: 'Funding Opportunity',
  applications: 'Application',
  auth: 'User Account',
  users: 'User Account',
  consulting: 'Consulting Request',
  scraping: 'Scraping Job',
  notifications: 'Notification',
  analytics: 'Analytics',
  audit: 'Audit Log',
  documents: 'Document',
}

function humanizeModel(modelName: string): string {
  return MODEL_LABELS[modelName] || modelName.charAt(0).toUpperCase() + modelName.slice(1).replace(/_/g, ' ')
}

function formatDateTime(dt: string | null | undefined): string {
  if (!dt) return 'N/A'
  const d = new Date(dt)
  if (isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function humanizeDiff(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const changes: string[] = []
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of keys) {
    if (key === 'method' || key === 'path' || key === 'success') continue
    const bVal = before[key]
    const aVal = after[key]
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      if (bVal === undefined || bVal === null || bVal === '') {
        changes.push(`Set "${label}" to "${aVal}"`)
      } else if (aVal === undefined || aVal === null || aVal === '') {
        changes.push(`Cleared "${label}"`)
      } else {
        changes.push(`Changed "${label}" from "${bVal}" to "${aVal}"`)
      }
    }
  }
  return changes
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const { data, isLoading, isError } = useQuery<Paginated<AuditLog>>({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => api.get('/audit/logs/', { params: { page } }).then(r => r.data),
  })

  const { data: detail } = useQuery<AuditLog>({
    queryKey: ['admin-audit-log-detail', selectedLog?.id],
    queryFn: () => api.get(`/audit/logs/${selectedLog!.id}/`).then(r => r.data),
    enabled: !!selectedLog,
  })

  return (
    <div className="flex gap-6 animate-fade-in">
      <div className={`space-y-4 transition-all ${selectedLog ? 'flex-1 min-w-0' : 'w-full'}`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Complete record of all system changes — who did what and when</p>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Who</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">What</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  </td></tr>
                ) : isError ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-red-600">Failed to load audit logs.</td></tr>
                ) : (data?.results?.length ?? 0) === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No audit logs found.</td></tr>
                ) : (
                  data?.results?.map(log => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${selectedLog?.id === log.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-medium">{log.user_email ?? 'System'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-medium">{humanizeModel(log.model_name)}</span>
                        {log.record_id != null && <span className="text-muted-foreground"> #{log.record_id}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip_address ?? 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(data?.count ?? 0) > 0 && (
          <div className="flex justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Previous</button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!data?.next}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedLog && (
        <div className="w-96 flex-shrink-0 rounded-xl border bg-white shadow-sm overflow-hidden self-start sticky top-0">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Audit Entry #{selectedLog.id}
            </h2>
            <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-5 text-sm overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Summary */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              <p className="font-semibold text-sm">What happened</p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{detail?.user_email ?? 'The system'}</span>
                {' '}{(ACTION_LABELS[detail?.action ?? ''] || detail?.action || '').toLowerCase()}d{' '}
                <span className="font-medium text-foreground">
                  {humanizeModel(detail?.model_name ?? selectedLog.model_name)}
                  {(detail?.record_id ?? selectedLog.record_id) != null ? ` #${detail?.record_id ?? selectedLog.record_id}` : ''}
                </span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDateTime(detail?.timestamp ?? selectedLog.timestamp)}
              </p>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><User className="h-3 w-3" /> User</p>
                <p className="font-medium text-xs break-all">{detail?.user_email ?? 'System'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Action</p>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ACTION_COLORS[detail?.action ?? selectedLog.action] || 'bg-gray-100 text-gray-700'}`}>
                  {ACTION_LABELS[detail?.action ?? selectedLog.action] || (detail?.action ?? selectedLog.action)}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Resource Type</p>
                <p className="font-medium text-xs">{humanizeModel(detail?.model_name ?? selectedLog.model_name)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Globe className="h-3 w-3" /> IP Address</p>
                <p className="font-mono text-xs">{detail?.ip_address ?? 'N/A'}</p>
              </div>
            </div>

            {/* Request info */}
            {detail?.data_after && typeof detail.data_after === 'object' && (detail.data_after as Record<string, unknown>).path && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Request Details</p>
                <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                  <p><span className="text-muted-foreground">Method:</span> <span className="font-mono font-bold">{String((detail.data_after as Record<string, unknown>).method || '')}</span></p>
                  <p><span className="text-muted-foreground">Path:</span> <span className="font-mono">{String((detail.data_after as Record<string, unknown>).path || '')}</span></p>
                  <p><span className="text-muted-foreground">Status:</span> <span className="font-mono">{String((detail.data_after as Record<string, unknown>).status || '')}</span></p>
                </div>
              </div>
            )}

            {/* Changes summary */}
            {detail?.data_before && detail?.data_after &&
             Object.keys(detail.data_before).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">What changed</p>
                {(() => {
                  const changes = humanizeDiff(
                    detail.data_before as Record<string, unknown>,
                    detail.data_after as Record<string, unknown>
                  )
                  if (changes.length === 0) {
                    return <p className="text-xs text-muted-foreground italic">No field changes detected</p>
                  }
                  return (
                    <ul className="space-y-1">
                      {changes.map((c, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </div>
            )}

            {/* User agent */}
            {detail?.user_agent && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Browser / Client</p>
                <p className="text-xs font-mono text-muted-foreground break-all bg-muted/50 rounded p-2">{detail.user_agent}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}