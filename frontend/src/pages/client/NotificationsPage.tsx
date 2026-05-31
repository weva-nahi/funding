import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatRelativeDate } from '@/utils/formatDate'
import { Bell, Check, CheckCheck, Trash2, Mail, Globe, FileText, MessageSquare } from 'lucide-react'

const icons: Record<string, typeof Bell> = {
  application_status: FileText,
  consulting_response: MessageSquare,
  new_opportunity: Globe,
  system: Bell,
  deadline_reminder: Bell,
  scraping_complete: Globe,
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then(r => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all/'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on your applications and opportunities</p>
        </div>
        <button onClick={() => markAllRead.mutate()} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (data?.results?.length || 0) === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="mx-auto h-12 w-12 mb-3 opacity-30" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.results?.map((n: any) => {
            const Icon = icons[n.notification_type] || Bell
            return (
              <div key={n.id} className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${n.is_read ? 'bg-white' : 'bg-primary/5 border-primary/20'}`}>
                <div className={`rounded-lg p-2 ${n.is_read ? 'bg-muted' : 'bg-primary/10'}`}>
                  <Icon className={`h-4 w-4 ${n.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${n.is_read ? 'text-muted-foreground' : 'font-medium'}`}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeDate(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead.mutate(n.id)} className="text-primary hover:text-primary/80">
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
