import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { useAuthStore } from '@/store'
import { FileText, Globe, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatDate, daysUntil } from '@/utils/formatDate'

export function DashboardPage() {
  const { user } = useAuthStore()

  const { data: apps } = useQuery({ queryKey: ['my-applications'], queryFn: () => api.get('/applications/?page_size=5').then(r => r.data) })
  const { data: opps } = useQuery({ queryKey: ['latest-opportunities'], queryFn: () => api.get('/opportunities/?page_size=5').then(r => r.data) })

  const stats = [
    { label: 'Total Applications', value: apps?.count || 0, icon: FileText, color: 'bg-blue-100 text-blue-600' },
    { label: 'Opportunities Available', value: opps?.count || 0, icon: Globe, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Pending Review', value: apps?.results?.filter((a: any) => a.status === 'pending').length || 0, icon: Clock, color: 'bg-amber-100 text-amber-600' },
    { label: 'Approved', value: apps?.results?.filter((a: any) => a.status === 'approved').length || 0, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back{user?.profile?.first_name ? `, ${user.profile.first_name}` : ''}</h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your funding journey.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${color}`}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-lg font-semibold">Recent Applications</h2>
          <Link to="/applications" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="p-6">
          {(apps?.results?.length || 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p>No applications yet. <Link to="/opportunities" className="text-primary hover:underline">Browse opportunities</Link> to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apps?.results?.slice(0, 5).map((app: any) => (
                <Link key={app.id} to={`/applications/${app.id}`} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{app.opportunity_title}</p>
                    <p className="text-xs text-muted-foreground">{app.opportunity_source} · {formatDate(app.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{app.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
          <Link to="/opportunities" className="text-sm text-primary hover:underline">Browse all →</Link>
        </div>
        <div className="p-6">
          {(opps?.results?.length || 0) === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {opps?.results?.filter((o: any) => o.deadline).slice(0, 5).map((opp: any) => {
                const days = daysUntil(opp.deadline)
                return (
                  <Link key={opp.id} to={`/opportunities/${opp.id}`} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{opp.title}</p>
                      <p className="text-xs text-muted-foreground">{opp.source}</p>
                    </div>
                    <span className={`text-xs font-medium ${days && days <= 7 ? 'text-red-600' : days && days <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {days != null ? (days <= 0 ? 'Expired' : `${days}d left`) : '—'}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
