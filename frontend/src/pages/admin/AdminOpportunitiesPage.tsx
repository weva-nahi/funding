import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import { formatCurrency } from '@/utils/formatCurrency'
import { getSourceLogo } from '@/lib/sourceLogos'
import { Search, Plus, Edit, Globe, X, ExternalLink, Calendar, DollarSign, MapPin, Tag, FileText } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Opportunity, Paginated } from '@/types'

export function AdminOpportunitiesPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [confirmPublish, setConfirmPublish] = useState<Opportunity | null>(null)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
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
          <h1 className="text-2xl font-bold tracking-tight">{t('adminNav.opportunities')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.overview')}</p>
        </div>
        <Link to="/admin/opportunities/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> {t('admin.addOpportunity')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder={t('common.search')} value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
          <option value="">{t('common.all')}</option>
          <option value="draft">{t('applications.statuses.draft')}</option>
          <option value="published">{t('opportunities.published')}</option>
          <option value="archived">{t('opportunities.archived')}</option>
        </select>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">{t('common.title')}</th>
                <th className="px-6 py-3 font-medium">{t('common.source')}</th>
                <th className="px-6 py-3 font-medium">{t('common.amount')}</th>
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
                data?.results?.map((opp) => {
                  const logo = getSourceLogo(opp.source)
                  return (
                  <tr key={opp.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium max-w-[250px] truncate" title={opp.title}>{opp.title}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5">
                        {logo && <img src={logo} alt={opp.source} className="h-4 w-4 object-contain" />}
                        {opp.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {opp.amount != null ? formatCurrency(opp.amount, opp.currency) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(opp.deadline ?? null)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        opp.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                        opp.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{t(`opportunities.${opp.status}`)}</span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-3">
                        {opp.status === 'draft' && (
                          <button onClick={() => setConfirmPublish(opp)}
                            className="text-xs text-emerald-600 hover:underline font-medium flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" /> {t('opportunities.publish')}
                          </button>
                        )}
                        <button onClick={() => setSelectedOpp(opp)}
                          className="text-xs text-primary hover:underline font-medium">{t('common.view')}</button>
                        <Link to={`/admin/opportunities/${opp.id}/edit`} className="text-muted-foreground hover:text-primary">
                          <Edit className="h-4 w-4" />
                        </Link>
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

      <ConfirmDialog
        open={!!confirmPublish}
        title={t('opportunities.publish')}
        message={`"${confirmPublish?.title}" ${t('opportunities.publishConfirm')}`}
        confirmLabel={t('opportunities.publish')}
        isLoading={publishMutation.isPending}
        onConfirm={() => confirmPublish && publishMutation.mutate(confirmPublish.id)}
        onCancel={() => setConfirmPublish(null)}
      />

      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedOpp(null)} />
          <div className="w-full max-w-xl bg-white shadow-2xl overflow-y-auto animate-slide-in-right flex flex-col">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-base line-clamp-1 pr-4">{selectedOpp.title}</h2>
              <button onClick={() => setSelectedOpp(null)} className="p-1.5 rounded hover:bg-muted flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {getSourceLogo(selectedOpp.source) && (
                  <img src={getSourceLogo(selectedOpp.source)} alt={selectedOpp.source} className="h-6 w-6 rounded object-contain" />
                )}
                <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">{selectedOpp.source}</span>
                {selectedOpp.funding_type && <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{selectedOpp.funding_type}</span>}
                {selectedOpp.sector && <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold">{selectedOpp.sector}</span>}
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  selectedOpp.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                  selectedOpp.status === 'archived' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'
                }`}>{t(`opportunities.${selectedOpp.status}`)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><DollarSign className="h-3.5 w-3.5" /> {t('common.amount')}</div>
                  <p className="font-bold text-sm">{selectedOpp.amount != null ? formatCurrency(selectedOpp.amount, selectedOpp.currency) : '—'}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Calendar className="h-3.5 w-3.5" /> {t('opportunities.deadline')}</div>
                  <p className="font-bold text-sm">{selectedOpp.deadline ? formatDate(selectedOpp.deadline) : '—'}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><MapPin className="h-3.5 w-3.5" /> {t('common.country')}</div>
                  <p className="font-bold text-sm">{selectedOpp.country || 'Mauritania'}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Tag className="h-3.5 w-3.5" /> {t('common.sector')}</div>
                  <p className="font-bold text-sm">{selectedOpp.sector || '—'}</p>
                </div>
              </div>

              {selectedOpp.description && (
                <div>
                  <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><FileText className="h-4 w-4" /> {t('common.description')}</p>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{selectedOpp.description}</p>
                </div>
              )}

              {selectedOpp.eligibility_criteria && (
                <div>
                  <p className="text-sm font-semibold mb-2">{t('opportunities.eligibility')}</p>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{selectedOpp.eligibility_criteria}</p>
                </div>
              )}

              {selectedOpp.required_documents && (
                <div>
                  <p className="text-sm font-semibold mb-2">{t('opportunities.requiredDocuments')}</p>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{selectedOpp.required_documents}</p>
                </div>
              )}

              {selectedOpp.url && (
                <a href={selectedOpp.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                  <ExternalLink className="h-4 w-4" /> {t('opportunities.originalSource')}
                </a>
              )}

              <div className="pt-2 border-t">
                <Link to={`/admin/opportunities/${selectedOpp.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                  <Edit className="h-4 w-4" /> {t('common.edit')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}