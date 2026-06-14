import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, useNotificationStore } from '@/store'
import api from '@/lib/axios'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const { setUnreadCount } = useNotificationStore()
  const location = useLocation()

  // Fetch unread count whenever this route renders with a valid session.
  // Runs on location change so the badge stays accurate across navigation.
  useEffect(() => {
    if (!isAuthenticated) return
    api
      .get('/notifications/unread-count/')
      .then((res) => {
        if (typeof res.data?.unread_count === 'number') {
          setUnreadCount(res.data.unread_count)
        }
      })
      .catch(() => {
        // Non-critical — badge may be stale but nothing breaks
      })
  }, [isAuthenticated, location.pathname, setUnreadCount])

  // Show a full-screen spinner while bootstrap() is in flight.
  // This prevents the flash-to-login problem on page refresh.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your session…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Save the attempted location so LoginPage can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}