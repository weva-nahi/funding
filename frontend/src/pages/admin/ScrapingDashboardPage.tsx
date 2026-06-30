import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { scrapingWS } from '@/lib/websocket'
import { Activity, Play, Trash2, Clock } from 'lucide-react'
import type { Paginated, ScrapingJob } from '@/types'

const SOURCES = [
  { value: 'all', label: 'allSources' },
  { value: 'gef', label: 'GEF' },
  { value: 'gcf', label: 'GCF' },
  { value: 'oecd', label: 'OECD' },
  { value: 'world_bank', label: 'World Bank' },
]

interface ScrapingUpdate {
  job_id: number
  projects_found: number
  status: string
}

interface SourceCount {
  [key: string]: number
}

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return '—'
  const start = new Date(startedAt).getTime()
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function formatDateTime(dt: string | null | undefined): string {
  if (!dt) return '—'
  const d = new Date(dt)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function ScrapingDashboardPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [source, setSource] = useState('all')
  const [page, setPage] = useState(1)
  const [activeJobs, setActiveJobs] = useState<Record<number, ScrapingUpdate>>({})
  const [confirmClear, setConfirmClear] = useState(false)

  const { data, isLoading } = useQuery<Paginated<ScrapingJob>>({
    queryKey: ['scraping-jobs', page],
    queryFn: () => api.get('/scraping/jobs/', { params: { page } }).then(r => r.data),
  })

  const { data: sourceCounts } = useQuery<SourceCount>({
    queryKey: ['source-counts'],
    queryFn: async () => {
      const sources = ['GEF', 'GCF', 'OECD', 'WORLD_BANK']
      const counts: SourceCount = {}
      await Promise.all(
        sources.map(async (src) => {
          try {
            const res = await api.get('/opportunities/admin/', {
              params: { status: 'published', source: src, page_size: 1 }
            })
            counts[src] = res.data.count || 0
          } catch {
            counts[src] = 0
          }
        })
      )
      return counts
    },
    staleTime: 60000,
  })

  useEffect(() => {
    scrapingWS.connect()
    const unsub = scrapingWS.subscribe((raw) => {
      const msg = raw as { type?: string; data?: ScrapingUpdate }
      if (msg.type === 'scraping_update' && msg.data) {
        const d = msg.data
        setActiveJobs(prev => ({ ...prev, [d.job_id]: d }))
        if (d.status === 'completed' || d.status === 'failed') {
          queryClient.invalidateQueries({ queryKey: ['scraping-jobs'] })
          queryClient.invalidateQueries({ queryKey: ['source-counts'] })
        }
      }
    })
    return () => unsub()
  }, [queryClient])

  const startMutation = useMutation({
    mutationFn: () => {
      if (source === 'all') {
        return api.post('/scraping/start-all/')
      }
      return api.post('/scraping/start/', { source })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scraping-jobs'] }),
  })

  const sourceLabel = (src: string) => {
    const map: Record<string, string> = {
      gef: 'GEF', gcf: 'GCF', oecd: 'OECD', world_bank: 'World Bank',
      GEF: 'GEF', GCF: 'GCF', OECD: 'OECD', WORLD_BANK: 'World Bank',
    }
    return map[src] || src.toUpperCase()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('adminNav.scraping')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('opportunities.scrapingDesc')}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { src: 'gef', label: 'GEF', key: 'GEF' },
          { src: 'gcf', label: 'GCF', key: 'GCF' },
          { src: 'oecd', label: 'OECD', key: 'OECD' },
          { src: 'world_bank', label: 'World Bank', key: 'WORLD_BANK' },
        ].map(({ src, label, key }) => (
          <div key={src} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-bold text-primary">{sourceCounts?.[key] ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('opportunities.published')}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">{t('opportunities.targetSource')}</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SOURCES.map(s => (
                <option key={s.value} value={s.value}>
                  {s.value === 'all' ? t('opportunities.allSources') : s.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {startMutation.isPending ? t('common.loading') : source === 'all' ? t('opportunities.scrapeAll') : t('opportunities.startScraping')}
          </button>
        </div>
        {source === 'all' && (
          <p className="text-xs text-muted-foreground border-t pt-3">
            {t('opportunities.scrapeAllDesc')}
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{t('opportunities.scrapingHistory')}</h2>
          {(data?.results?.length ?? 0) > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('common.clear')}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">{t('common.source')}</th>
                <th className="px-6 py-3 font-medium">{t('common.status')}</th>
                <th className="px-6 py-3 font-medium">{t('opportunities.newFound')}</th>
                <th className="px-6 py-3 font-medium">{t('opportunities.startedAt')}</th>
                <th className="px-6 py-3 font-medium">{t('opportunities.duration')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    {t('opportunities.noJobs')}
                  </td>
                </tr>
              ) : (
                data?.results?.map(job => {
                  const wsData = activeJobs[job.id] ?? null
                  const status = wsData?.status || job.status
                  const isRunning = status === 'running' || status === 'pending'
                  const found = wsData?.projects_found ?? job.projects_found
                  return (
                    <tr key={job.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium">#{job.id}</td>
                      <td className="px-6 py-4 font-semibold">{sourceLabel(job.source)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          status === 'failed' ? 'bg-red-100 text-red-700' :
                          status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {isRunning && <Activity className="h-3 w-3 animate-pulse" />}
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${found > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {found} {t('opportunities.new')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(job.started_at)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(job.started_at, job.finished_at)}
                          {isRunning && <span className="text-blue-500 text-xs">({t('opportunities.running')})</span>}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {(data?.count ?? 0) > 0 && (
          <div className="flex justify-center gap-2 p-4 border-t">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.previous')}</button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">{t('common.page')} {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!data?.next}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.next')}</button>
          </div>
        )}
      </div>

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="font-semibold text-lg">{t('opportunities.clearHistory')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('opportunities.clearHistoryDesc')}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmClear(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">{t('common.cancel')}</button>
              <button
                onClick={async () => {
                  try {
                    const jobIds = data?.results?.map(j => j.id) || []
                    for (const jobId of jobIds) {
                      try { await api.delete?.(`/scraping/jobs/${jobId}/`) } catch { /* ignore */ }
                    }
                  } catch { /* ignore */ } finally {
                    queryClient.invalidateQueries({ queryKey: ['scraping-jobs'] })
                    setConfirmClear(false)
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t('common.clear')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}