import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, useNotificationStore } from '@/store'
import { useQueryClient } from '@tanstack/react-query'
import { notificationWS } from '@/lib/websocket'
import api, { setAccessToken } from '@/lib/axios'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import {
  LayoutDashboard, Search, FileText, Bell, MessageSquare, User, LogOut, Menu, Bookmark,
  ChevronDown, Settings,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/opportunities', icon: Search, label: 'Opportunities' },
  { to: '/applications', icon: FileText, label: 'My Applications' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/consulting', icon: MessageSquare, label: 'Consulting' },
  { to: '/profile', icon: User, label: 'Profile' },
]

interface WSNotification { id: number; is_read: boolean }

export function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuthStore()
  const { unreadCount, setUnreadCount, incrementUnread } = useNotificationStore()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    api.get('/notifications/unread-count/')
      .then((res) => setUnreadCount(res.data.unread_count ?? 0))
      .catch(() => {})
  }, [setUnreadCount])

  useEffect(() => {
    const unsubscribe = notificationWS.subscribe((raw) => {
      const msg = raw as WSNotification
      if (msg?.id && !msg.is_read) incrementUnread()
    })
    return unsubscribe
  }, [incrementUnread])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try { await api.post('/auth/logout/') } catch {}
    queryClient.clear()
    setAccessToken(null)
    logout() // broadcast=true by default — syncs logout across all open tabs
    navigate('/login', { replace: true })
  }

  const initials = (user?.profile?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const displayName = user?.profile?.first_name && user?.profile?.last_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user?.email

  return (
    <div className="flex h-screen bg-muted/30">
      <aside className={`fixed inset-y-0 start-0 z-50 w-64 transform bg-white border-e shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}>
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-sm">R</div>
          <span className="text-lg font-bold bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent">Richat</span>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/')
            return (
              <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />
                {label}
                {label === 'Notifications' && unreadCount > 0 && (
                  <span className="ms-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
          <Link to="/opportunities?saved=true" onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <Bookmark className="h-4 w-4" /> Saved
          </Link>
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden" aria-label="Open sidebar"><Menu className="h-5 w-5" /></button>
          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher />

            {/* User menu — replaces the raw email text that "looks ugly" */}
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
                    <User className="h-4 w-4 text-muted-foreground" /> My Profile
                  </Link>
                  <Link to="/profile/notifications" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                    <Settings className="h-4 w-4 text-muted-foreground" /> Notification Settings
                  </Link>
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t">
                    <LogOut className="h-4 w-4" /> Logout
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