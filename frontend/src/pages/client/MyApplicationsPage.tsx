import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import { FileText, ChevronRight } from 'lucide-react'
import type { Application, Paginated } from '@/types'

const STATUS_KEYS = ['', 'pending', 'shortlisted', 'approved', 'rejected']

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  shortlisted: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

export function MyApplicationsPage() {
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery<Paginated<Application>>({
    queryKey: ['my-applications', statusFilter, page],
    queryFn: () =>
      api
        .get('/applications/', {
          params: { status: statusFilter || undefined, page },
        })
        .then((r) => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('applications.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('applications.subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_KEYS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s)
              setPage(1)
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s === '' ? t('applications.all') : t(`applications.statuses.${s}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-red-600">
          {t('errors.loadFailed')}
        </div>
      ) : (data?.results?.length ?? 0) === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-3 opacity-30" />
          <p>{t('applications.noApplications')}</p>
          <Link
            to="/opportunities"
            className="mt-2 inline-block text-primary hover:underline"
          >
            {t('opportunities.browseAll')} →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.results?.map((app) => (
            <Link
              key={app.id}
              to={`/applications/${app.id}`}
              className="flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex-1">
                <p className="font-semibold">{app.opportunity_title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{app.opportunity_source}</span>
                  <span>·</span>
                  <span>{formatDate(app.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {t(`applications.statuses.${app.status}`)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {(data?.count ?? 0) > 0 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data?.previous}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted"
          >
            {t('common.previous')}
          </button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {t('common.page')} {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.next}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  )
}