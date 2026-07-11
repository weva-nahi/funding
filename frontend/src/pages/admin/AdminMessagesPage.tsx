import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { formatRelativeDate } from '@/utils/formatDate'
import { MessageThread } from '@/components/MessageThread'
import { Inbox, Search } from 'lucide-react'
import type { Contact, ConversationMessage } from '@/types'

export function AdminMessagesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<number | null>(
    searchParams.get('contact') ? Number(searchParams.get('contact')) : null
  )

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['admin-contacts', search],
    queryFn: () => api.get('/messaging/admin/contacts/', { params: { search: search || undefined } }).then((r) => r.data),
    refetchInterval: 15000,
  })

  useEffect(() => {
    if (selectedContactId === null && contacts && contacts.length > 0) {
      setSelectedContactId(contacts[0].user_id)
    }
  }, [contacts, selectedContactId])

  const { data: messages } = useQuery<ConversationMessage[]>({
    queryKey: ['admin-contact-thread', selectedContactId],
    queryFn: () => api.get(`/messaging/admin/contacts/${selectedContactId}/thread/`).then((r) => r.data),
    enabled: !!selectedContactId,
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
          ? `/applications/admin/${lastMessage.application_id}/messages/`
          : `/consulting/admin/${lastMessage.consulting_request_id}/messages/`
      return api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-thread', selectedContactId] })
      queryClient.invalidateQueries({ queryKey: ['admin-contacts'] })
    },
  })

  const selectContact = (userId: number) => {
    setSelectedContactId(userId)
    setSearchParams({ contact: String(userId) })
  }

  const selectedContact = contacts?.find((c) => c.user_id === selectedContactId) ?? null

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('adminNav.messages')}</h1>
        <p className="text-muted-foreground mt-1">{t('messages.adminSubtitle')}</p>
      </div>

      <div className="flex-1 rounded-xl border bg-white shadow-sm flex overflow-hidden">
        <div className="w-72 flex-shrink-0 border-e flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('messages.searchContacts')}
                className="w-full rounded-lg border ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contactsLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (contacts?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center px-4">
                <Inbox className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">{t('messages.noContacts')}</p>
              </div>
            ) : (
              contacts?.map((contact) => {
                const initials = (contact.display_name?.[0] || contact.email[0]).toUpperCase()
                const active = contact.user_id === selectedContactId
                return (
                  <button
                    key={contact.user_id}
                    onClick={() => selectContact(contact.user_id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b hover:bg-muted/50 transition-colors ${
                      active ? 'bg-primary/5' : ''
                    }`}
                  >
                    {contact.avatar ? (
                      <img src={contact.avatar} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{contact.display_name}</p>
                        {contact.unread_count > 0 && (
                          <span className="flex-shrink-0 h-4 min-w-[1rem] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                            {contact.unread_count > 99 ? '99+' : contact.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{contact.last_message_preview}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {!selectedContact ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Inbox className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{t('messages.selectConversation')}</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b">
                <h2 className="font-semibold">{selectedContact.display_name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedContact.email}
                  {selectedContact.company ? ` · ${selectedContact.company}` : ''}
                  {lastMessage ? ` · ${formatRelativeDate(lastMessage.created_at)}` : ''}
                </p>
              </div>
              <MessageThread
                messages={messages ?? []}
                viewerRole="admin"
                richatTeamLabel={t('applications.richatTeam')}
                emptyStateText={t('applications.noMessages')}
                placeholder={t('applications.writeMessage')}
                onSend={(content, attachment) => sendMessage.mutate({ content, attachment })}
                isSending={sendMessage.isPending}
                maxHeightClass="max-h-[55vh]"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
