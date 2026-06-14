import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store'
import { setAccessToken } from '@/lib/axios'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import api from '@/lib/axios'
import App from './App'
import './styles/globals.css'

/**
 * bootstrap() runs BEFORE the React tree mounts.
 *
 * On every cold start it attempts a silent token refresh using the httpOnly
 * refresh-token cookie set at login:
 *   1. POST /auth/token/refresh/  → new access token (stored in memory)
 *   2. GET  /auth/me/             → current user → setUser()
 *
 * If the cookie is absent or expired, the catch block calls setLoading(false),
 * isAuthenticated stays false, and ProtectedRoute will redirect to /login.
 *
 * Whatever happens, we mount via .finally() so a failed refresh can NEVER
 * leave the page blank.
 */
async function bootstrap(): Promise<void> {
  const { setUser, setLoading } = useAuthStore.getState()

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
    // No valid session — stop loading so ProtectedRoute can redirect.
    setLoading(false)
  }
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

bootstrap().finally(mount)