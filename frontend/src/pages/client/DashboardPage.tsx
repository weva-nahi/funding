import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { useAuthStore } from '@/store'
import { FileText, Globe, Clock, Bookmark } from 'lucide-react'
import { formatDate, daysUntil } from '@/utils/formatDate'
import type { Application, Opportunity, Paginated } from '@/types'

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const { data: apps } = useQuery<Paginated<Application>>({
    queryKey: ['my-applications'],
    queryFn: () => api.get('/applications/?page_size=5').then((r) => r.data),
  })

  const { data: opps } = useQuery<Paginated<Opportunity>>({
    queryKey: ['latest-opportunities'],
    queryFn: () => api.get('/opportunities/?page_size=5').then((r) => r.data),
  })

  const { data: savedOpps } = useQuery<Paginated<Opportunity>>({
    queryKey: ['opportunities-saved-count'],
    queryFn: () =>
      api.get('/opportunities/saved/?page_size=1').then((r) => r.data),
  })

  const stats = [
    {
      label: t('dashboard.totalApplications'),
      value: apps?.count ?? 0,
      icon: FileText,
      color: 'bg-blue-100 text-blue-600',
      to: '/applications',
    },
    {
      label: t('dashboard.availableOpportunities'),
      value: opps?.count ?? 0,
      icon: Globe,
      color: 'bg-emerald-100 text-emerald-600',
      to: '/opportunities',
    },
    {
      label: t('dashboard.pendingReview'),
      value: apps?.results?.filter((a) => a.status === 'pending').length ?? 0,
      icon: Clock,
      color: 'bg-amber-100 text-amber-600',
      to: '/applications',
    },
    {
      label: t('dashboard.savedOpportunities'),
      value: savedOpps?.count ?? 0,
      icon: Bookmark,
      color: 'bg-purple-100 text-purple-600',
      to: '/opportunities?saved=true',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dashboard.welcome')}
          {user?.profile?.first_name ? `, ${user.profile.first_name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.overview')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, to }) => (
          <Link
            key={label}
            to={to}
            className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-lg font-semibold">{t('dashboard.recentApplications')}</h2>
            <Link
              to="/applications"
              className="text-sm text-primary hover:underline"
            >
              {t('common.viewAll')} →
            </Link>
          </div>
          <div className="p-6">
            {(apps?.results?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
                <p>
                  {t('dashboard.noApplications')}{' '}
                  <Link
                    to="/opportunities"
                    className="text-primary hover:underline"
                  >
                    {t('dashboard.browseOpportunities')}
                  </Link>{' '}
                  {t('dashboard.toGetStarted')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {apps?.results?.slice(0, 5).map((app) => (
                  <Link
                    key={app.id}
                    to={`/applications/${app.id}`}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {app.opportunity_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(app.created_at)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        app.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : app.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : app.status === 'shortlisted'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {t(`applications.statuses.${app.status}`)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-lg font-semibold">{t('dashboard.upcomingDeadlines')}</h2>
            <Link
              to="/opportunities"
              className="text-sm text-primary hover:underline"
            >
              {t('opportunities.browseAll')} →
            </Link>
          </div>
          <div className="p-6">
            {(opps?.results?.filter((o) => o.deadline)?.length ?? 0) === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                {t('dashboard.noDeadlines')}
              </p>
            ) : (
              <div className="space-y-3">
                {opps?.results
                  ?.filter((o) => o.deadline)
                  .slice(0, 5)
                  .map((opp) => {
                    const days = daysUntil(opp.deadline ?? null)
                    return (
                      <Link
                        key={opp.id}
                        to={`/opportunities/${opp.id}`}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm">{opp.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {opp.source}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            days != null && days <= 7
                              ? 'text-red-600'
                              : days != null && days <= 30
                              ? 'text-amber-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {days != null
                            ? days <= 0
                              ? t('dashboard.expired')
                              : t('dashboard.daysLeft', { days })
                            : '—'}
                        </span>
                      </Link>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}