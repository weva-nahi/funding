import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store'
import { setAccessToken } from '@/lib/axios'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import api from '@/lib/axios'
import '@/lib/i18n'
import App from './App'
import './styles/globals.css'

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