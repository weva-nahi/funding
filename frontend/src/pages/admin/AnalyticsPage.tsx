import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { DownloadCloud, BarChart3 } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

interface ActivityPoint {
  day: string
  count: number
}
interface StatusSlice {
  status: string
  count: number
}
interface SourceRow {
  source: string
  count: number
}

const COLORS = [
  '#224f8b',
  '#3375cc',
  '#9dbde7',
  '#f59e0b',
  '#ef4444',
  '#6366f1',
  '#8b5cf6',
]

export function AnalyticsPage() {
  const { t } = useTranslation()
  const { data: activity, isLoading: aLoading } = useQuery<ActivityPoint[]>({
    queryKey: ['analytics-activity'],
    queryFn: () =>
      api
        .get('/analytics/activity/', { params: { days: 30 } })
        .then((r) => r.data),
  })
  const { data: distribution } = useQuery<StatusSlice[]>({
    queryKey: ['analytics-status'],
    queryFn: () =>
      api.get('/analytics/status-distribution/').then((r) => r.data),
  })
  const { data: sources } = useQuery<SourceRow[]>({
    queryKey: ['analytics-sources'],
    queryFn: () => api.get('/analytics/top-sources/').then((r) => r.data),
  })

  const handleExport = async () => {
    const res = await api.get('/analytics/export/', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'analytics.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('admin.fullAnalytics')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.analyticsPage.subtitle')}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg bg-white border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <DownloadCloud className="h-4 w-4" /> {t('admin.analyticsPage.exportCsv')}
        </button>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b pb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('admin.analyticsPage.applicationsOverTime')}
          </h2>
        </div>
        {aLoading ? (
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={activity ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#224f8b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-4">
            {t('admin.analyticsPage.statusDistribution')}
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={distribution ?? []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {(distribution ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-4">
            {t('admin.analyticsPage.topSources')}
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sources ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="source" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3375cc" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}