import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

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
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If an admin tries to access client pages, redirect to admin home
  const isAdminPath = location.pathname.startsWith('/admin')
  const isClientPath = !isAdminPath && (
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/opportunities') ||
    location.pathname.startsWith('/applications') ||
    location.pathname.startsWith('/notifications') ||
    location.pathname.startsWith('/consulting') ||
    location.pathname.startsWith('/profile')
  )

  if (user?.role === 'admin' && isClientPath) {
    return <Navigate to="/admin" replace />
  }

  if (user?.role === 'client' && isAdminPath) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}