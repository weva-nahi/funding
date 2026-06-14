import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, useNotificationStore } from '@/store'
import { notificationWS } from '@/lib/websocket'
import api, { setAccessToken } from '@/lib/axios'
import {
  LayoutDashboard,
  Search,
  FileText,
  Bell,
  MessageSquare,
  User,
  LogOut,
  Menu,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/opportunities', icon: Search, label: 'Opportunities' },
  { to: '/applications', icon: FileText, label: 'My Applications' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/consulting', icon: MessageSquare, label: 'Consulting' },
  { to: '/profile', icon: User, label: 'Profile' },
]

interface WSNotification {
  id: number
  is_read: boolean
}

export function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { unreadCount, setUnreadCount, incrementUnread } = useNotificationStore()
  const location = useLocation()
  const navigate = useNavigate()

  // Fetch unread count once when the layout mounts (after login or page refresh)
  useEffect(() => {
    api
      .get('/notifications/unread-count/')
      .then((res) => setUnreadCount(res.data.unread_count ?? 0))
      .catch(() => {/* non-critical */})
  }, [setUnreadCount])

  // Subscribe to real-time notifications for live badge increments
  useEffect(() => {
    const unsubscribe = notificationWS.subscribe((raw) => {
      const msg = raw as WSNotification
      if (msg?.id && !msg.is_read) {
        incrementUnread()
      }
    })
    return unsubscribe
  }, [incrementUnread])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout/')
    } catch {
      // Best-effort server-side blacklist — proceed regardless
    }
    setAccessToken(null)
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r shadow-lg
          transition-transform duration-300 lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700
            flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-teal-700 to-teal-500
            bg-clip-text text-transparent">
            Richat
          </span>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active =
              location.pathname === to ||
              location.pathname.startsWith(to + '/')
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm
                  font-medium transition-all
                  ${active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {label === 'Notifications' && unreadCount > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center
                    justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold
                    text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm
              font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600
              transition-all"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}