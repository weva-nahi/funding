import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import {
  LayoutDashboard, FileText, Globe, Upload, Bot, AlertTriangle, MessageSquare,
  Users, BarChart3, Shield, LogOut, Menu, Settings
} from 'lucide-react'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/applications', icon: FileText, label: 'Applications' },
  { to: '/admin/opportunities', icon: Globe, label: 'Opportunities' },
  { to: '/admin/excel-import', icon: Upload, label: 'Excel Import' },
  { to: '/admin/scraping', icon: Bot, label: 'Scraping' },
  { to: '/admin/scraping/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/admin/consulting', icon: MessageSquare, label: 'Consulting' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/audit', icon: Shield, label: 'Audit Logs' },
]

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { const { default: api } = await import('@/lib/axios'); await api.post('/auth/logout/') } catch {}
    logout(); navigate('/login')
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-slate-900 text-white shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-6">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center font-bold text-sm text-slate-900">R</div>
          <div>
            <span className="text-lg font-bold">Richat</span>
            <span className="ml-1 text-xs rounded bg-teal-500/20 px-1.5 py-0.5 text-teal-300">Admin</span>
          </div>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Icon className="h-4 w-4" />{label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-4 left-0 right-0 px-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/20 hover:text-red-300 transition-all">
            <LogOut className="h-4 w-4" />Logout
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="ml-auto flex items-center gap-4">
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Admin</span>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}
