import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: (broadcast?: boolean) => void
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
      import('@/lib/websocket').then(({ notificationWS, sessionSync }) => {
        notificationWS.connect()
        sessionSync.broadcastLogin()
      })
    } else {
      import('@/lib/websocket').then(({ notificationWS }) => {
        notificationWS.disconnect()
      })
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  // `broadcast` defaults to true: a normal user-initiated logout from THIS
  // tab should tell every other open tab to log out too. When logout()
  // is invoked BECAUSE this tab received a broadcast from another tab
  // (see main.tsx's sessionSync.subscribe handler), broadcast=false is
  // passed to avoid an infinite ping-pong of logout messages between tabs.
  logout: (broadcast = true) => {
    sessionStorage.removeItem('has_session')
    set({ user: null, isAuthenticated: false, isLoading: false })
    import('@/lib/websocket').then(({ notificationWS, sessionSync }) => {
      notificationWS.disconnect()
      if (broadcast) {
        sessionSync.broadcastLogout()
      }
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