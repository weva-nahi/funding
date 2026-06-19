import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    if (user) {
      sessionStorage.setItem('has_session', '1')
    } else {
      sessionStorage.removeItem('has_session')
    }
    set({ user, isAuthenticated: !!user, isLoading: false })

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
    sessionStorage.removeItem('has_session')
    set({ user: null, isAuthenticated: false, isLoading: false })
    import('@/lib/websocket').then(({ notificationWS }) => {
      notificationWS.disconnect()
    })
    import('@/lib/axios').then(({ setAccessToken }) => {
      setAccessToken(null)
    })
  },
}))

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