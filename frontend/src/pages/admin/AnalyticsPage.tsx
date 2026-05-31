import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { DownloadCloud, BarChart3 } from 'lucide-react'

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics-full'],
    queryFn: () => api.get('/analytics/dashboard/').then(r => r.data),
  })

  // Full integration would use Recharts here to render the time-series arrays
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Full Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform metrics and data visualization</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-white border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          <DownloadCloud className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {isLoading ? (
         <div className="h-64 rounded-xl border bg-muted animate-pulse" />
      ) : (
        <div className="grid gap-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-4 border-b pb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Applications Over Time</h2>
             </div>
             {/* Chart Placeholder */}
             <div className="h-64 flex items-center justify-center bg-muted/20 border border-dashed rounded-lg">
                <p className="text-muted-foreground">Chart Component: Uses Recharts configured with data.applications_over_time</p>
             </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
             <div className="rounded-xl border bg-white p-6 shadow-sm">
               <h2 className="text-lg font-semibold mb-4 border-b pb-4">Approval Rate</h2>
               <div className="h-48 flex items-center justify-center bg-muted/20 border border-dashed rounded-lg">
                  <p className="text-muted-foreground text-sm">Pie Chart</p>
               </div>
             </div>
             <div className="rounded-xl border bg-white p-6 shadow-sm">
               <h2 className="text-lg font-semibold mb-4 border-b pb-4">Top Funding Sources</h2>
               <div className="h-48 flex items-center justify-center bg-muted/20 border border-dashed rounded-lg">
                  <p className="text-muted-foreground text-sm">Bar Chart</p>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
