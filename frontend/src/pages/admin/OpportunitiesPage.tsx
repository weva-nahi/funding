import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import { Search, Plus, Edit, Globe } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Opportunity, Paginated } from '@/types'

export function AdminOpportunitiesPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [confirmPublish, setConfirmPublish] = useState<Opportunity | null>(null)
  const debouncedSearch = useDebounce(search)
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<Paginated<Opportunity>>({
    queryKey: ['admin-opportunities', debouncedSearch, statusFilter, page],
    queryFn: () => api.get('/opportunities/admin/', {
      params: { search: debouncedSearch || undefined, status: statusFilter || undefined, page }
    }).then(r => r.data),
  })

  const publishMutation = useMutation({
    mutationFn: (id: number) => api.post(`/opportunities/admin/${id}/publish/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] })
      setConfirmPublish(null)
    },
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.opportunitiesPage.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.opportunitiesPage.subtitle')}</p>
        </div>
        <Link to="/admin/opportunities/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> {t('admin.opportunitiesPage.newOpportunity')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder={t('admin.opportunitiesPage.searchPlaceholder')} value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
          <option value="">{t('admin.opportunitiesPage.allStatuses')}</option>
          <option value="draft">{t('admin.opportunitiesPage.statusDraft')}</option>
          <option value="published">{t('admin.opportunitiesPage.statusPublished')}</option>
          <option value="archived">{t('admin.opportunitiesPage.statusArchived')}</option>
        </select>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">{t('common.title')}</th>
                <th className="px-6 py-3 font-medium">{t('common.source')}</th>
                <th className="px-6 py-3 font-medium">{t('admin.opportunitiesPage.city')}</th>
                <th className="px-6 py-3 font-medium">{t('opportunities.deadline')}</th>
                <th className="px-6 py-3 font-medium">{t('common.status')}</th>
                <th className="px-6 py-3 font-medium text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-red-600">{t('errors.loadFailed')}</td></tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">{t('common.noResults')}</td></tr>
              ) : (
                data?.results?.map((opp) => (
                  <tr key={opp.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium max-w-[250px] truncate" title={opp.title}>{opp.title}</td>
                    <td className="px-6 py-4">{opp.source}</td>
                    <td className="px-6 py-4 text-muted-foreground">{opp.city || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(opp.deadline ?? null)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        opp.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                        opp.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{opp.status}</span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-3">
                        {opp.status === 'draft' && (
                          <button onClick={() => setConfirmPublish(opp)}
                            className="text-xs text-emerald-600 hover:underline font-medium flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" /> {t('admin.opportunitiesPage.publish')}
                          </button>
                        )}
                        <Link to={`/admin/opportunities/${opp.id}/edit`} className="text-muted-foreground hover:text-primary">
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
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
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.previous')}</button>
          <button onClick={() => setPage(p => p + 1)} disabled={!data?.next} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.next')}</button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmPublish}
        title={t('admin.opportunitiesPage.publishConfirmTitle')}
        message={t('admin.opportunitiesPage.publishConfirmMessage', { title: confirmPublish?.title })}
        confirmLabel={t('admin.opportunitiesPage.publish')}
        isLoading={publishMutation.isPending}
        onConfirm={() => confirmPublish && publishMutation.mutate(confirmPublish.id)}
        onCancel={() => setConfirmPublish(null)}
      />
    </div>
  )
}