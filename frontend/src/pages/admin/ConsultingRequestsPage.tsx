import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import { MessageThread, type ThreadMessage } from '@/components/MessageThread'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Paginated } from '@/types'

interface ConsultingReq {
  id: number
  user_email: string
  company: string
  description: string
  priority: string
  status: string
  messages: ThreadMessage[] | null | undefined
  created_at: string
}

function AdminConversation({ req }: { req: ConsultingReq }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const messages = Array.isArray(req.messages) ? req.messages : []

  const sendMessage = useMutation({
    mutationFn: ({ content, attachment }: { content: string; attachment: File | null }) => {
      const fd = new FormData()
      if (content.trim()) fd.append('content', content)
      if (attachment) fd.append('attachment', attachment)
      return api.post(`/consulting/admin/${req.id}/messages/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consulting'] })
    },
  })

  return (
    <div className="border-t">
      <MessageThread
        messages={messages}
        viewerRole="admin"
        richatTeamLabel={t('applications.richatTeam')}
        emptyStateText={t('consulting.startConversation')}
        placeholder={t('consulting.writeMessage')}
        onSend={(content, attachment) => sendMessage.mutate({ content, attachment })}
        isSending={sendMessage.isPending}
        maxHeightClass="max-h-72"
      />
    </div>
  )
}

export function ConsultingRequestsPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery<Paginated<ConsultingReq>>({
    queryKey: ['admin-consulting', page],
    queryFn: () =>
      api.get('/consulting/admin/', { params: { page } }).then((r) => r.data),
    refetchInterval: 15000,
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.consultingPage.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('admin.consultingPage.subtitle')}</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="h-32 rounded-xl border bg-muted animate-pulse" />
        ) : isError ? (
          <div className="text-center p-8 text-red-600 bg-white border rounded-xl">
            {t('errors.loadFailed')}
          </div>
        ) : (data?.results?.length ?? 0) === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-white border rounded-xl">
            {t('consulting.noRequests')}
          </div>
        ) : (
          data?.results?.map((req) => {
            const isExpanded = expandedId === req.id
            const messages = Array.isArray(req.messages) ? req.messages : []
            return (
              <div key={req.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        req.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : req.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {t(`admin.consultingPage.priority${req.priority.charAt(0).toUpperCase()}${req.priority.slice(1)}`)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {req.user_email}
                        {req.company ? ` · ${req.company}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{req.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-xs text-muted-foreground">
                      {t('consulting.messageCount', { count: messages.length })}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {formatDate(req.created_at)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && <AdminConversation req={req} />}
              </div>
            )
          })
        )}
      </div>

      {(data?.count ?? 0) > 0 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data?.previous}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            {t('common.previous')}
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.next}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  )
}
