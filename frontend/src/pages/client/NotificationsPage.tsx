import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useNotificationStore } from '@/store'
import { formatRelativeDate } from '@/utils/formatDate'
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  MessageSquare,
  Globe,
} from 'lucide-react'
import type { NotificationItem, Paginated } from '@/types'

const iconMap: Record<string, typeof Bell> = {
  application_status: FileText,
  consulting_response: MessageSquare,
  new_opportunity: Globe,
  system: Bell,
  deadline_reminder: Bell,
  scraping_complete: Globe,
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { setUnreadCount } = useNotificationStore()

  const { data, isLoading } = useQuery<Paginated<NotificationItem>>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then((r) => r.data),
  })

  // Re-fetch the authoritative unread count from the server after any mutation
  const refreshUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count/')
      setUnreadCount(res.data.unread_count ?? 0)
    } catch {
      // Non-critical
    }
  }

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      refreshUnreadCount()
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setUnreadCount(0)
    },
  })

  const unreadItems = data?.results?.filter((n) => !n.is_read) ?? []

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on your applications and opportunities
          </p>
        </div>
        {unreadItems.length > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2
              text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (data?.results?.length ?? 0) === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="mx-auto h-14 w-14 mb-4 opacity-20" />
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-sm mt-1">
            We'll notify you when something important happens.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.results?.map((n) => {
            const Icon = iconMap[n.notification_type] || Bell
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 rounded-xl border p-4
                  transition-colors
                  ${n.is_read
                    ? 'bg-white'
                    : 'bg-primary/5 border-primary/20'}`}
              >
                <div
                  className={`rounded-lg p-2 flex-shrink-0
                    ${n.is_read ? 'bg-muted' : 'bg-primary/10'}`}
                >
                  <Icon
                    className={`h-4 w-4
                      ${n.is_read
                        ? 'text-muted-foreground'
                        : 'text-primary'}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm
                      ${n.is_read
                        ? 'text-muted-foreground'
                        : 'font-medium text-foreground'}`}
                  >
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeDate(n.created_at)}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    disabled={markRead.isPending}
                    className="flex-shrink-0 text-primary hover:text-primary/80
                      disabled:opacity-50 p-1 rounded hover:bg-primary/10
                      transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}