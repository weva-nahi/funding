import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { X, Shield, User, Clock, Globe, Activity } from 'lucide-react'
import type { AuditLog, Paginated } from '@/types'
import i18n from '@/lib/i18n'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

function actionLabel(action: string): string {
  const key = { CREATE: 'actionCreated', UPDATE: 'actionUpdated', DELETE: 'actionDeleted' }[action]
  return key ? i18n.t(`admin.auditLogsPage.${key}`) : action
}

function humanizeModel(modelName: string): string {
  const translated = i18n.t(`admin.auditLogsPage.model.${modelName}`, { defaultValue: '' })
  return translated || (modelName.charAt(0).toUpperCase() + modelName.slice(1).replace(/_/g, ' '))
}

function formatDateTime(dt: string | null | undefined): string {
  if (!dt) return i18n.t('admin.auditLogsPage.notAvailable')
  const d = new Date(dt)
  if (isNaN(d.getTime())) return i18n.t('admin.auditLogsPage.notAvailable')
  return d.toLocaleString(i18n.language, { dateStyle: 'long', timeStyle: 'medium' })
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
        changes.push(i18n.t('admin.auditLogsPage.setTo', { label, value: aVal }))
      } else if (aVal === undefined || aVal === null || aVal === '') {
        changes.push(i18n.t('admin.auditLogsPage.cleared', { label }))
      } else {
        changes.push(i18n.t('admin.auditLogsPage.changedFromTo', { label, before: bVal, after: aVal }))
      }
    }
  }
  return changes
}

export function AuditLogsPage() {
  const { t } = useTranslation()
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

  const requestPath = detail?.data_after && typeof detail.data_after === 'object'
    ? String((detail.data_after as Record<string, unknown>).path ?? '')
    : ''

  return (
    <div className="flex gap-6 animate-fade-in">
      <div className={`space-y-4 transition-all ${selectedLog ? 'flex-1 min-w-0' : 'w-full'}`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('adminNav.auditLogs')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.auditLogsPage.subtitle')}</p>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('admin.auditLogsPage.when')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.auditLogsPage.who')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.auditLogsPage.action')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.auditLogsPage.what')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.auditLogsPage.ipAddress')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  </td></tr>
                ) : isError ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-red-600">{t('admin.auditLogsPage.loadFailed')}</td></tr>
                ) : (data?.results?.length ?? 0) === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('admin.auditLogsPage.noLogs')}</td></tr>
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
                          <span className="text-xs font-medium">{log.user_email ?? t('admin.auditLogsPage.system')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-medium">{humanizeModel(log.model_name)}</span>
                        {log.record_id != null && <span className="text-muted-foreground"> #{log.record_id}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip_address ?? t('admin.auditLogsPage.notAvailable')}</td>
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
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.previous')}</button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">{t('common.page')} {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!data?.next}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.next')}</button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedLog && (
        <div className="w-96 flex-shrink-0 rounded-xl border bg-white shadow-sm overflow-hidden self-start sticky top-0">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> {t('admin.auditLogsPage.entryNum', { id: selectedLog.id })}
            </h2>
            <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-5 text-sm overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Summary */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              <p className="font-semibold text-sm">{t('admin.auditLogsPage.whatHappened')}</p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{detail?.user_email ?? t('admin.auditLogsPage.system')}</span>
                {' '}{actionLabel(detail?.action ?? selectedLog.action).toLowerCase()}{' '}
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
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><User className="h-3 w-3" /> {t('admin.auditLogsPage.user')}</p>
                <p className="font-medium text-xs break-all">{detail?.user_email ?? t('admin.auditLogsPage.system')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t('admin.auditLogsPage.action')}</p>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ACTION_COLORS[detail?.action ?? selectedLog.action] || 'bg-gray-100 text-gray-700'}`}>
                  {actionLabel(detail?.action ?? selectedLog.action)}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t('admin.auditLogsPage.resourceType')}</p>
                <p className="font-medium text-xs">{humanizeModel(detail?.model_name ?? selectedLog.model_name)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Globe className="h-3 w-3" /> {t('admin.auditLogsPage.ipAddress')}</p>
                <p className="font-mono text-xs">{detail?.ip_address ?? t('admin.auditLogsPage.notAvailable')}</p>
              </div>
            </div>

            {/* Request info */}
            {requestPath && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> {t('admin.auditLogsPage.requestDetails')}</p>
                <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                  <p><span className="text-muted-foreground">{t('admin.auditLogsPage.method')}</span> <span className="font-mono font-bold">{String((detail?.data_after as Record<string, unknown>).method || '')}</span></p>
                  <p><span className="text-muted-foreground">{t('admin.auditLogsPage.path')}</span> <span className="font-mono">{requestPath}</span></p>
                  <p><span className="text-muted-foreground">{t('admin.auditLogsPage.status')}</span> <span className="font-mono">{String((detail?.data_after as Record<string, unknown>).status || '')}</span></p>
                </div>
              </div>
            )}

            {/* Changes summary */}
            {detail?.data_before && detail?.data_after &&
             Object.keys(detail.data_before).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">{t('admin.auditLogsPage.whatChanged')}</p>
                {(() => {
                  const changes = humanizeDiff(
                    detail.data_before as Record<string, unknown>,
                    detail.data_after as Record<string, unknown>
                  )
                  if (changes.length === 0) {
                    return <p className="text-xs text-muted-foreground italic">{t('admin.auditLogsPage.noFieldChanges')}</p>
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
                <p className="text-xs text-muted-foreground mb-1">{t('admin.auditLogsPage.browserClient')}</p>
                <p className="text-xs font-mono text-muted-foreground break-all bg-muted/50 rounded p-2">{detail.user_agent}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
