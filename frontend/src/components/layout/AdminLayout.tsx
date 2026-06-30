import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import api from '@/lib/axios'
import { formatRelativeDate } from '@/utils/formatDate'
import { richatLogo } from '@/lib/sourceLogos'
import {
  LayoutDashboard, FileText, Globe, Upload, Bot, MessageSquare,
  Users, BarChart3, Shield, LogOut, Menu, ChevronDown, Bell, User,
  CheckCheck, FileTextIcon, MessageSquareIcon, GlobeIcon,
} from 'lucide-react'
import type { NotificationItem, Paginated } from '@/types'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, key: 'dashboard', exact: true },
  { to: '/admin/applications', icon: FileText, key: 'applications' },
  { to: '/admin/opportunities', icon: Globe, key: 'opportunities' },
  { to: '/admin/excel-import', icon: Upload, key: 'excelImport' },
  { to: '/admin/scraping', icon: Bot, key: 'scraping' },
  { to: '/admin/consulting', icon: MessageSquare, key: 'consulting' },
  { to: '/admin/users', icon: Users, key: 'users' },
  { to: '/admin/analytics', icon: BarChart3, key: 'analytics' },
  { to: '/admin/audit', icon: Shield, key: 'auditLogs' },
]

const notifIcons: Record<string, typeof Bell> = {
  application_status: FileTextIcon,
  consulting_response: MessageSquareIcon,
  new_opportunity: GlobeIcon,
  system: Bell,
  deadline_reminder: Bell,
  scraping_complete: GlobeIcon,
}

export function AdminLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: notifData } = useQuery<Paginated<NotificationItem>>({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get('/notifications/?page_size=10').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: unreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['admin-unread-count'],
    queryFn: () => api.get('/notifications/unread-count/').then(r => r.data),
    refetchInterval: 15000,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-unread-count'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-unread-count'] })
    },
  })

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout/')
    } catch {}
    queryClient.clear()
    logout()
    navigate('/login', { replace: true })
  }

  const unreadCount = unreadData?.unread_count ?? 0
  const notifications = notifData?.results ?? []
  const initials = (user?.profile?.first_name?.[0] || user?.email?.[0] || 'A').toUpperCase()
  const avatarUrl = user?.profile?.avatar
  const displayName = user?.profile?.first_name && user?.profile?.last_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user?.email

  return (
    <div className="flex h-screen bg-muted/30">
      <aside className={`fixed inset-y-0 start-0 z-50 w-64 transform border-e bg-slate-900 text-white shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}>
        <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-6">
          <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={richatLogo} alt="Richat Partners" className="h-8 w-8 rounded-lg object-cover" />
            <div>
              <span className="text-lg font-bold">Richat</span>
              <span className="ms-1 text-xs rounded bg-teal-500/20 px-1.5 py-0.5 text-teal-300">{t('nav.admin')}</span>
            </div>
          </Link>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, key, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Icon className="h-4 w-4" />{t(`adminNav.${key}`)}
              </Link>
            )
          })}
          <Link to="/admin/profile" onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${location.pathname === '/admin/profile' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <User className="h-4 w-4" /> {t('adminNav.myProfile')}
          </Link>
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher />

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifPanelOpen(v => !v)}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label={t('nav.notifications')}
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifPanelOpen && (
                <div className="absolute end-0 top-full mt-2 w-96 rounded-xl border bg-white shadow-2xl overflow-hidden z-50 animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-bold text-base">{t('notifications.title')}</h3>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllRead.mutate()}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        <CheckCheck className="h-3.5 w-3.5" /> {t('notifications.markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        <Bell className="mx-auto h-8 w-8 mb-2 opacity-20" />
                        {t('notifications.noNotifications')}
                      </div>
                    ) : (
                      notifications.map(n => {
                        const Icon = notifIcons[n.notification_type] || Bell
                        return (
                          <div key={n.id}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                            onClick={() => { if (!n.is_read) markRead.mutate(n.id) }}
                          >
                            <div className={`rounded-full p-2 flex-shrink-0 mt-0.5 ${!n.is_read ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Icon className={`h-3.5 w-3.5 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${!n.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                                {n.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(n.created_at)}</p>
                            </div>
                            {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">{t('nav.admin')}</span>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full py-1 ps-1 pe-3 hover:bg-muted transition-colors"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-bold text-white">
                    {initials}
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium max-w-[160px] truncate">{displayName}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute end-0 top-full mt-2 w-56 rounded-xl border bg-white shadow-lg overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <Link to="/admin/profile" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                    <User className="h-4 w-4 text-muted-foreground" /> {t('adminNav.myProfile')}
                  </Link>
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t">
                    <LogOut className="h-4 w-4" /> {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}