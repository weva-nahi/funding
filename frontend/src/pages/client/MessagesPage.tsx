import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { MessageThread } from '@/components/MessageThread'
import { Inbox } from 'lucide-react'
import type { ConversationMessage } from '@/types'

export function MessagesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: messages, isLoading } = useQuery<ConversationMessage[]>({
    queryKey: ['my-thread'],
    queryFn: () => api.get('/messaging/thread/').then((r) => r.data),
    refetchInterval: 15000,
  })

  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null

  const sendMessage = useMutation({
    mutationFn: ({ content, attachment }: { content: string; attachment: File | null }) => {
      if (!lastMessage) return Promise.reject(new Error('no thread'))
      const fd = new FormData()
      if (content.trim()) fd.append('content', content)
      if (attachment) fd.append('attachment', attachment)
      const endpoint =
        lastMessage.source === 'application'
          ? `/applications/${lastMessage.application_id}/messages/`
          : `/consulting/${lastMessage.consulting_request_id}/messages/`
      return api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-thread'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('messages.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('messages.subtitle')}</p>
      </div>

      <div className="flex-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden">
        {!lastMessage ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground text-center px-6">
            <Inbox className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t('messages.noContacts')}</p>
            <p className="text-sm mt-1 max-w-sm">{t('messages.emptyStateCta')}</p>
            <div className="flex gap-3 mt-4">
              <Link to="/opportunities" className="text-primary hover:underline text-sm font-medium">
                {t('messages.browseOpportunities')}
              </Link>
              <Link to="/consulting" className="text-primary hover:underline text-sm font-medium">
                {t('messages.askConsulting')}
              </Link>
            </div>
          </div>
        ) : (
          <MessageThread
            messages={messages ?? []}
            viewerRole="client"
            richatTeamLabel={t('applications.richatTeam')}
            emptyStateText={t('applications.noMessages')}
            placeholder={t('applications.writeMessage')}
            onSend={(content, attachment) => sendMessage.mutate({ content, attachment })}
            isSending={sendMessage.isPending}
            maxHeightClass="max-h-[60vh]"
          />
        )}
      </div>
    </div>
  )
}
