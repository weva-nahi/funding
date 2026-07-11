import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useNotificationStore } from '@/store'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { notificationWS } from '@/lib/websocket'
import api, { setAccessToken } from '@/lib/axios'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { formatRelativeDate } from '@/utils/formatDate'
import { richatLogo } from '@/lib/sourceLogos'
import {
  LayoutDashboard, Search, FileText, Bell, MessageSquare, Inbox, User, LogOut, Menu, Bookmark,
  ChevronDown, CheckCheck, FileTextIcon, MessageSquareIcon, GlobeIcon,
} from 'lucide-react'
import type { NotificationItem, Paginated } from '@/types'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/opportunities', icon: Search, key: 'opportunities' },
  { to: '/applications', icon: FileText, key: 'applications' },
  { to: '/consulting', icon: MessageSquare, key: 'consulting' },
  { to: '/messages', icon: Inbox, key: 'messages' },
  { to: '/profile', icon: User, key: 'profile' },
]

const notifIcons: Record<string, typeof Bell> = {
  application_status: FileTextIcon,
  consulting_response: MessageSquareIcon,
  new_message: MessageSquareIcon,
  new_opportunity: GlobeIcon,
  system: Bell,
  deadline_reminder: Bell,
  scraping_complete: GlobeIcon,
}

interface WSNotification { id: number; is_read: boolean }

export function ClientLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuthStore()
  const { unreadCount, setUnreadCount, incrementUnread } = useNotificationStore()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: notifData, refetch: refetchNotifs } = useQuery<Paginated<NotificationItem>>({
    queryKey: ['client-notifications'],
    queryFn: () => api.get('/notifications/?page_size=15').then(r => r.data),
    refetchInterval: 30000,
  })

  useEffect(() => {
    api.get('/notifications/unread-count/')
      .then((res) => setUnreadCount(res.data.unread_count ?? 0))
      .catch(() => {})
  }, [setUnreadCount])

  const { data: messagesUnreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['client-messages-unread-count'],
    queryFn: () => api.get('/messaging/unread-count/').then((r) => r.data),
    refetchInterval: 15000,
  })
  const messagesUnreadCount = messagesUnreadData?.unread_count ?? 0

  useEffect(() => {
    const unsubscribe = notificationWS.subscribe((raw) => {
      const msg = raw as WSNotification
      if (msg?.id && !msg.is_read) {
        incrementUnread()
        refetchNotifs()
      }
    })
    return unsubscribe
  }, [incrementUnread, refetchNotifs])

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] })
      api.get('/notifications/unread-count/').then(res => setUnreadCount(res.data.unread_count ?? 0))
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] })
      setUnreadCount(0)
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
    try { await api.post('/auth/logout/') } catch {}
    queryClient.clear()
    setAccessToken(null)
    logout()
    navigate('/login', { replace: true })
  }

  const notifications = notifData?.results ?? []
  const initials = (user?.profile?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const displayName = user?.profile?.first_name && user?.profile?.last_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user?.email

  return (
    <div className="flex h-screen bg-muted/30">
      <aside className={`fixed inset-y-0 start-0 z-50 w-64 transform bg-white border-e shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 lg:rtl:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}>
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={richatLogo} alt="Richat Partners" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-bold bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent">Richat</span>
          </Link>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, key }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/')
            return (
              <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />
                {t(`nav.${key}`)}
                {key === 'messages' && messagesUnreadCount > 0 && (
                  <span className="ms-auto h-4 min-w-[1rem] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                    {messagesUnreadCount > 99 ? '99+' : messagesUnreadCount}
                  </span>
                )}
              </Link>
            )
          })}
          <Link to="/opportunities?saved=true" onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <Bookmark className="h-4 w-4" /> {t('nav.saved')}
          </Link>
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden" aria-label="Open sidebar"><Menu className="h-5 w-5" /></button>
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

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full py-1 ps-1 pe-3 hover:bg-muted transition-colors"
              >
                {user?.profile?.avatar ? (
                  <img src={user.profile.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-xs font-bold text-white">
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
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                    <User className="h-4 w-4 text-muted-foreground" /> {t('nav.myProfile')}
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