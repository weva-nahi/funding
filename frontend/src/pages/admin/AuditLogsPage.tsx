import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import type { AuditLog, Paginated } from '@/types'

export function AuditLogsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery<Paginated<AuditLog>>({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => api.get('/audit/logs/', { params: { page } }).then(r => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Immutable record of all system modifications</p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Resource</th>
                <th className="px-6 py-3 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-red-600">Failed to load audit logs.</td></tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No audit logs found.</td></tr>
              ) : (
                data?.results?.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{formatDate(log.timestamp)}</td>
                    <td className="px-6 py-4 font-medium">{log.user_email ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{log.action}</span>
                    </td>
                    <td className="px-6 py-4">{log.model_name}{log.record_id != null ? ` #${log.record_id}` : ''}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{log.ip_address ?? '—'}</td>
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
    </div>
  )
}