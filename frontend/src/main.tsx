import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store'
import { setAccessToken } from '@/lib/axios'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import api from '@/lib/axios'
import { sessionSync } from '@/lib/websocket'
import '@/lib/i18n'
import App from './App'
import './styles/globals.css'

/**
 * Session bootstrap on every fresh page load / refresh / navigation.
 *
 * The `has_session` sessionStorage flag is set on successful login and
 * cleared on logout (see store/index.ts). It exists because access tokens
 * live ONLY in memory (never localStorage, for security — see axios.ts),
 * so a hard refresh always wipes the in-memory access token. Without this
 * bootstrap step, every refresh would silently log the user out even
 * though their httpOnly refresh-token cookie is still valid — this was
 * the literal "login session is lost on page refresh" bug.
 *
 * sessionStorage (not localStorage) is used deliberately: it's scoped per
 * tab, which is what lets each tab independently decide whether it has a
 * session to restore, while still surviving same-tab refresh/navigation.
 */
async function bootstrap(): Promise<void> {
  const { setUser, setLoading } = useAuthStore.getState()

  if (!sessionStorage.getItem('has_session')) {
    setLoading(false)
    return
  }

  try {
    const refreshRes = await api.post('/auth/token/refresh/')
    const newAccessToken: string = refreshRes.data?.access

    if (!newAccessToken) {
      setLoading(false)
      return
    }

    setAccessToken(newAccessToken)

    const meRes = await api.get('/auth/me/')
    setUser(meRes.data)
  } catch {
    sessionStorage.removeItem('has_session')
    setLoading(false)
  }
}

/**
 * Cross-tab logout sync — fixes "multiple tabs don't sync logout".
 *
 * When ANY tab logs out, it broadcasts via BroadcastChannel (see
 * lib/websocket.ts). Every other open tab of the same origin receives
 * that message here and force-logs-out locally too, instead of sitting
 * authenticated in a stale state until the user notices or hits a 401.
 *
 * `logout(false)` is called (not the default `logout()`) so the receiving
 * tab does NOT re-broadcast — only the tab where the user actually clicked
 * "Logout" should be the origin of the broadcast.
 */
function setupCrossTabSessionSync(): void {
  sessionSync.subscribe((msg) => {
    if (msg.type === 'logout') {
      useAuthStore.getState().logout(false)
      // Avoid leaving the user on an admin/client page they can no longer
      // access — send every other tab back to login.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
  })
}

function mount(): void {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

setupCrossTabSessionSync()
bootstrap().finally(mount)