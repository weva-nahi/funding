import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { CheckCircle, XCircle, AlertTriangle, Clock, Zap } from 'lucide-react'
import { formatDate } from '@/utils/formatDate'
import { formatCurrency } from '@/utils/formatCurrency'
import type { Paginated, ScrapingAlert } from '@/types'

export function ScrapingAlertsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery<Paginated<ScrapingAlert>>({
    queryKey: ['scraping-alerts', page],
    queryFn: () => api.get('/scraping/alerts/', { params: { page } }).then(r => r.data),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'publish' | 'archive' | 'ignore' }) =>
      api.post(`/scraping/alerts/${id}/action/`, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scraping-alerts'] }),
  })

  const bulkPublishMutation = useMutation({
    mutationFn: () => {
      const ids = (data?.results ?? []).map(a => a.opportunity?.id).filter(Boolean)
      return api.post('/opportunities/admin/bulk-publish/', { ids })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] })
    },
  })

  const newAlerts = data?.results?.filter(a => a.status === 'new') ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('adminNav.scraping')} {t('common.alerts')}</h1>
          <p className="text-muted-foreground mt-1">{t('opportunities.scrapingAlertsDesc')}</p>
        </div>
        {newAlerts.length > 0 && (
          <button
            onClick={() => bulkPublishMutation.mutate()}
            disabled={bulkPublishMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {bulkPublishMutation.isPending ? t('common.publishing') : `${t('opportunities.publishAllNew')} (${newAlerts.length})`}
          </button>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">{t('common.priority')}</th>
                <th className="px-6 py-3 font-medium">{t('opportunities.opportunity')}</th>
                <th className="px-6 py-3 font-medium">{t('common.amount')}</th>
                <th className="px-6 py-3 font-medium">{t('opportunities.deadline')}</th>
                <th className="px-6 py-3 font-medium text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-red-600">{t('errors.loadFailed')}</td></tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('opportunities.noAlerts')}</td></tr>
              ) : (
                data?.results?.map((alert) => {
                  const opp = alert.opportunity
                  return (
                    <tr key={alert.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          alert.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          alert.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {alert.priority === 'urgent' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {t(`common.${alert.priority}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium max-w-[250px] truncate" title={opp?.title}>
                        {opp?.url ? (
                          <a href={opp.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{opp?.title}</a>
                        ) : (opp?.title)}
                        <div className="text-xs text-muted-foreground mt-0.5">{opp?.source} • {opp?.country || '—'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono">{opp?.amount != null ? formatCurrency(opp.amount, opp.currency) : 'N/A'}</td>
                      <td className="px-6 py-4">{opp?.deadline ? formatDate(opp.deadline) : 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => actionMutation.mutate({ id: alert.id, action: 'publish' })} disabled={actionMutation.isPending} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title={t('opportunities.publish')}>
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button onClick={() => actionMutation.mutate({ id: alert.id, action: 'ignore' })} disabled={actionMutation.isPending} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title={t('common.dismiss')}>
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
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
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.previous')}</button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">{t('common.page')} {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!data?.next} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.next')}</button>
        </div>
      )}
    </div>
  )
}