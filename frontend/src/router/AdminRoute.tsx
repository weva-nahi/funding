import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
