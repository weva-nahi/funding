import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '@/lib/axios'
import { scrapingWS } from '@/lib/websocket'
import { SOURCES } from '@/lib/constants'
import { formatDate } from '@/utils/formatDate'
import { Activity, Play, XSquare } from 'lucide-react'
import type { Paginated, ScrapingJob } from '@/types'

interface ScrapingUpdate {
  job_id: number
  pages_scraped: number
  total_pages: number
  projects_found: number
  status: string
}

export function ScrapingDashboardPage() {
  const queryClient = useQueryClient()
  const [source, setSource] = useState('gef')
  const [pages, setPages] = useState(5)
  const [activeJobs, setActiveJobs] = useState<Record<number, ScrapingUpdate>>({})

  const { data, isLoading } = useQuery<Paginated<ScrapingJob>>({
    queryKey: ['scraping-jobs'],
    queryFn: () => api.get('/scraping/jobs/').then(r => r.data),
  })

  useEffect(() => {
    scrapingWS.connect()
    const unsubscribe = scrapingWS.subscribe((raw) => {
      const msg = raw as { type?: string; data?: ScrapingUpdate }
      if (msg.type === 'scraping_update' && msg.data) {
        const d = msg.data
        setActiveJobs(prev => ({ ...prev, [d.job_id]: d }))
        if (d.status === 'completed' || d.status === 'failed') {
          queryClient.invalidateQueries({ queryKey: ['scraping-jobs'] })
        }
      }
    })
    return () => { unsubscribe(); scrapingWS.disconnect() }
  }, [queryClient])

  const startMutation = useMutation({
    mutationFn: () => api.post('/scraping/start/', { source, max_pages: pages }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scraping-jobs'] }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/scraping/jobs/${id}/cancel/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scraping-jobs'] }),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scraping Orchestrator</h1>
        <p className="text-muted-foreground mt-1">Manage background web scraping jobs</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-sm font-medium">Target Source</label>
          <select value={source} onChange={e => setSource(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm bg-white">
            {SOURCES.map(s => <option key={s.value} value={s.value.toLowerCase()}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-sm font-medium">Max Pages</label>
          <input type="number" value={pages} onChange={e => setPages(parseInt(e.target.value) || 1)} min={1} max={20} className="w-full rounded-lg border px-3 py-2.5 text-sm" />
        </div>
        <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50">
          <Play className="h-4 w-4" /> Start Job
        </button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold p-6 border-b">Scraping History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Progress</th>
                <th className="px-6 py-3 font-medium">Found</th>
                <th className="px-6 py-3 font-medium">Started At</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" /></td></tr>
              ) : (data?.results?.length ?? 0) === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No scraping jobs run yet.</td></tr>
              ) : (
                data?.results?.map((job) => {
                  const wsData = activeJobs[job.id] || null
                  const status = wsData?.status || job.status
                  const isRunning = status === 'running' || status === 'pending'
                  const progressStr = wsData ? `${wsData.pages_scraped}/${wsData.total_pages}` : `${job.pages_scraped} pages`
                  const found = wsData?.projects_found ?? job.projects_found
                  return (
                    <tr key={job.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium">#{job.id}</td>
                      <td className="px-6 py-4 uppercase">{job.source}</td>
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
                      <td className="px-6 py-4">{progressStr}</td>
                      <td className="px-6 py-4 font-semibold text-emerald-600">{found}</td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{formatDate(job.started_at)}</td>
                      <td className="px-6 py-4 text-right">
                        {isRunning && (
                          <button onClick={() => cancelMutation.mutate(job.id)} className="text-red-500 hover:text-red-700 rounded-lg p-1 hover:bg-red-50">
                            <XSquare className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}