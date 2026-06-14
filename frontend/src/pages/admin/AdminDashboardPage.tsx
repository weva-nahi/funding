import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { Users, FileText, Globe, Activity, ArrowRight, BarChart3, CheckCircle } from 'lucide-react'
import type { Application, DashboardStats, Paginated } from '@/types'

export function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/analytics/dashboard/').then(r => r.data),
  })

  const { data: pendingApps, isLoading: appsLoading } = useQuery<Paginated<Application>>({
    queryKey: ['admin-pending-apps'],
    queryFn: () => api.get('/applications/admin/?status=pending&page_size=5').then(r => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and recent activity</p>
        </div>
        <Link to="/admin/analytics" className="inline-flex items-center gap-2 rounded-lg bg-white border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          <BarChart3 className="h-4 w-4" /> Full Analytics
        </Link>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg p-3 bg-blue-100 text-blue-600"><Users className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.active_clients ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active Clients</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg p-3 bg-amber-100 text-amber-600"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.pending_applications ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pending Applications</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg p-3 bg-emerald-100 text-emerald-600"><CheckCircle className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.approved_this_month ?? 0}</p>
                <p className="text-xs text-muted-foreground">Approved This Month</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg p-3 bg-purple-100 text-purple-600"><Globe className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_applications ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-lg font-semibold">Pending Applications</h2>
            <Link to="/admin/applications" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="p-6 flex-1">
            {appsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : (pendingApps?.results?.length ?? 0) === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No pending applications to review.</p>
            ) : (
              <div className="space-y-3">
                {pendingApps?.results?.map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-sm">{app.opportunity_title}</p>
                      <p className="text-xs text-muted-foreground">{app.user_email}</p>
                    </div>
                    <Link to="/admin/applications" className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="p-6 grid gap-4 grid-cols-2 flex-1">
            <Link to="/admin/opportunities/new" className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-muted/50 hover:border-primary/50 transition-all text-center gap-3 group">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium">Add Opportunity</span>
            </Link>
            <Link to="/admin/scraping" className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-muted/50 hover:border-primary/50 transition-all text-center gap-3 group">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <span className="font-medium">Run Scrapers</span>
            </Link>
            <Link to="/admin/excel-import" className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-muted/50 hover:border-primary/50 transition-all text-center gap-3 group">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="font-medium">Import Excel</span>
            </Link>
            <Link to="/admin/consulting" className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-muted/50 hover:border-primary/50 transition-all text-center gap-3 group">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <span className="font-medium">Consulting</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}