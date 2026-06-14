import { create } from 'zustand'
import type { User } from '@/types'

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  /**
   * true while bootstrap() is attempting a silent token refresh.
   * ProtectedRoute shows a full-screen spinner during this window.
   * Must be set to false by setUser() or setLoading(false) when bootstrap ends.
   */
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // true until bootstrap() resolves

  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false })

    // Connect or disconnect the notification WebSocket based on auth state.
    // Lazy import avoids circular dependency at module load time.
    if (user) {
      import('@/lib/websocket').then(({ notificationWS }) => {
        notificationWS.connect()
      })
    } else {
      import('@/lib/websocket').then(({ notificationWS }) => {
        notificationWS.disconnect()
      })
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    set({ user: null, isAuthenticated: false, isLoading: false })
    // Disconnect WebSocket
    import('@/lib/websocket').then(({ notificationWS }) => {
      notificationWS.disconnect()
    })
    // Clear in-memory access token
    import('@/lib/axios').then(({ setAccessToken }) => {
      setAccessToken(null)
    })
  },
}))

// ─── Notification Store ───────────────────────────────────────────────────────

interface NotificationState {
  unreadCount: number
  setUnreadCount: (count: number) => void
  incrementUnread: () => void
  decrementUnread: (by?: number) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  decrementUnread: (by = 1) =>
    set((s) => ({ unreadCount: Math.max(0, s.unreadCount - by) })),
}))