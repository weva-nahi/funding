import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import { extractError } from '@/utils/extractError'
import { Search, Eye, Layers, Lock } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import type { Application, Paginated } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  shortlisted: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

interface ApplicationWithCompany extends Application {
  company?: string
}

export function ApplicationsReviewPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const debouncedSearch = useDebounce(search)
  const queryClient = useQueryClient()

  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [pendingAction, setPendingAction] = useState<null | {
    appId: number
    action: 'approve' | 'reject'
    comment: string
  }>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  const updateFilter = (value: string) => {
    setStatusFilter(value)
    setPage(1)
    setSelectedIds(new Set())
    const next = new URLSearchParams(searchParams)
    if (value) next.set('status', value)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }

  const { data, isLoading, isError } = useQuery<Paginated<ApplicationWithCompany>>({
    queryKey: ['admin-applications', debouncedSearch, statusFilter, page],
    queryFn: () =>
      api.get('/applications/admin/', {
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          page,
        },
      }).then((r) => r.data),
  })

  const bulkShortlistMutation = useMutation({
    mutationFn: (ids: number[]) => api.post('/applications/admin/bulk-shortlist/', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      setSelectedIds(new Set())
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({ appId, action, comment }: { appId: number; action: string; comment: string }) =>
      api.post(`/applications/admin/${appId}/review/`, {
        action,
        comment: action !== 'reject' ? comment : undefined,
        reason: action === 'reject' ? comment : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      setShowPasswordDialog(false)
      setPendingAction(null)
      setConfirmPassword('')
      setPasswordError('')
    },
    onError: (err: unknown) => {
      setPasswordError(extractError(err, t('errors.submitFailed')))
    },
  })

  const verifyAndExecute = async () => {
    if (!pendingAction) return
    setPasswordError('')
    try {
      const res = await api.post('/auth/verify-admin-password/', { password: confirmPassword })
      if (res.data.success) {
        reviewMutation.mutate(pendingAction)
      } else {
        setPasswordError(t('auth.passwordsNoMatch'))
      }
    } catch {
      setPasswordError(t('auth.passwordsNoMatch'))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const eligibleForBulk = (data?.results ?? []).filter((a) => a.status === 'pending')

  const toggleSelectAll = () => {
    if (selectedIds.size === eligibleForBulk.length && eligibleForBulk.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(eligibleForBulk.map((a) => a.id)))
    }
  }

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'pending', label: t('applications.statuses.pending') },
    { value: 'shortlisted', label: t('applications.statuses.shortlisted') },
    { value: 'approved', label: t('applications.statuses.approved') },
    { value: 'rejected', label: t('applications.statuses.rejected') },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.pendingApplications')}</h1>
        <p className="text-muted-foreground mt-1">{t('applications.subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => updateFilter(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === t.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full rounded-lg border ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3">
          <span className="text-sm font-medium text-indigo-800">{selectedIds.size} {t('common.selected')}</span>
          <button
            onClick={() => bulkShortlistMutation.mutate(Array.from(selectedIds))}
            disabled={bulkShortlistMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Layers className="h-4 w-4" />
            {bulkShortlistMutation.isPending ? t('common.processing') : t('applications.statuses.shortlisted')}
          </button>
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium w-10">
                  {(statusFilter === '' || statusFilter === 'pending') ? (
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={selectedIds.size > 0 && selectedIds.size === eligibleForBulk.length}
                      className="rounded border-gray-300"
                    />
                  ) : null}
                </th>
                <th className="px-4 py-3 font-medium">{t('common.company')}</th>
                <th className="px-4 py-3 font-medium">{t('common.email')}</th>
                <th className="px-6 py-3 font-medium">{t('opportunities.title')}</th>
                <th className="px-6 py-3 font-medium">{t('common.date')}</th>
                <th className="px-6 py-3 font-medium">{t('common.status')}</th>
                <th className="px-6 py-3 font-medium text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                </td></tr>
              ) : isError ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-red-600">{t('errors.loadFailed')}</td></tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">{t('common.noResults')}</td></tr>
              ) : (
                data?.results?.map((app) => (
                  <tr key={app.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-4">
                      {app.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(app.id)}
                          onChange={() => toggleSelect(app.id)}
                          className="rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium text-sm">
                      {(app as ApplicationWithCompany).company || <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground text-xs">{app.user_email}</td>
                    <td className="px-6 py-4 font-medium max-w-[180px] truncate">{app.opportunity_title}</td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{formatDate(app.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {t(`applications.statuses.${app.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <button
                        onClick={() => navigate(`/admin/applications/${app.id}`)}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-sm"
                      >
                        <Eye className="h-3.5 w-3.5" /> {t('common.view')}
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
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data?.previous}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted">{t('common.previous')}</button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">{t('common.page')} {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={!data?.next}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted">{t('common.next')}</button>
        </div>
      )}

      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold">{t('common.confirm')}</h2>
                <p className="text-xs text-muted-foreground">{t('common.confirm')}</p>
              </div>
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') verifyAndExecute() }}
              placeholder={t('auth.password')}
              autoFocus
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowPasswordDialog(false); setPendingAction(null); setConfirmPassword(''); setPasswordError('') }}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={verifyAndExecute}
                disabled={!confirmPassword || reviewMutation.isPending}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {reviewMutation.isPending ? t('common.processing') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}