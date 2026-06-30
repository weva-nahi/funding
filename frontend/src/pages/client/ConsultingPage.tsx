import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { formatDate, formatRelativeDate } from '@/utils/formatDate'
import { CharCounter } from '@/components/CharCounter'
import { useAuthStore } from '@/store'
import { MessageSquare, Send, Plus, Paperclip, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { Paginated } from '@/types'

const DESCRIPTION_MAX = 1000

interface ConsultingMessage {
  id: number
  sender_email: string
  sender_role: string
  content: string
  attachment: string | null
  attachment_name: string
  created_at: string
}

interface ConsultingRequest {
  id: number
  description: string
  priority: string
  status: string
  messages: ConsultingMessage[] | null | undefined
  created_at: string
}

function ConversationThread({ req, currentUserEmail }: { req: ConsultingRequest; currentUserEmail: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = Array.isArray(req.messages) ? req.messages : []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const sendMessage = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      if (message.trim()) fd.append('content', message)
      if (attachment) fd.append('attachment', attachment)
      return api.post(`/consulting/${req.id}/messages/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      setMessage('')
      setAttachment(null)
      queryClient.invalidateQueries({ queryKey: ['my-consulting'] })
    },
  })

  return (
    <div className="flex flex-col border-t">
      <div className="overflow-y-auto p-4 space-y-3 max-h-56">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">{t('consulting.startConversation')}</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_email === currentUserEmail
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                }`}>
                  {!isMe && (
                    <p className="text-[10px] font-semibold mb-1 opacity-70">
                      {msg.sender_role === 'admin' ? t('applications.richatTeam') : msg.sender_email}
                    </p>
                  )}
                  {msg.content && <p>{msg.content}</p>}
                  {msg.attachment_name && (
                    <a href={msg.attachment || '#'} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 mt-1 underline text-xs opacity-80">
                      <Paperclip className="h-3 w-3" />
                      {msg.attachment_name}
                    </a>
                  )}
                  <p className={`text-[10px] mt-1 ${isMe ? 'opacity-70 text-right' : 'text-muted-foreground'}`}>
                    {formatRelativeDate(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        {attachment && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>{attachment.name}</span>
            <button onClick={() => setAttachment(null)}><X className="h-3 w-3 text-red-500" /></button>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="rounded-lg border p-2.5 hover:bg-muted transition-colors">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </button>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden"
            onChange={e => setAttachment(e.target.files?.[0] ?? null)} />
          <input type="text" value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && (message.trim() || attachment)) {
                e.preventDefault()
                sendMessage.mutate()
              }
            }}
            placeholder={t('consulting.writeMessage')}
            className="flex-1 rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={() => sendMessage.mutate()}
            disabled={sendMessage.isPending || (!message.trim() && !attachment)}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConsultingPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [desc, setDesc] = useState('')
  const [priority, setPriority] = useState('medium')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, isLoading } = useQuery<Paginated<ConsultingRequest>>({
    queryKey: ['my-consulting'],
    queryFn: () => api.get('/consulting/').then(r => r.data),
    refetchInterval: 15000,
  })

  const create = useMutation({
    mutationFn: () => api.post('/consulting/', { description: desc, priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-consulting'] })
      setShowForm(false)
      setDesc('')
    },
  })

  const requests = data?.results ?? []

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('consulting.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('consulting.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
          <Plus className="h-4 w-4" /> {t('consulting.newRequest')}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4 mb-6">
          <h3 className="font-semibold">{t('consulting.submitRequest')}</h3>
          <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0, DESCRIPTION_MAX))}
            rows={4} placeholder={t('consulting.descriptionPlaceholder')}
            className="w-full rounded-lg border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          <div className="flex justify-end -mt-2">
            <CharCounter current={desc.length} max={DESCRIPTION_MAX} />
          </div>
          <div className="flex items-center gap-3">
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="low">{t('consulting.lowPriority')}</option>
              <option value="medium">{t('consulting.mediumPriority')}</option>
              <option value="high">{t('consulting.highPriority')}</option>
            </select>
            <button disabled={desc.length < 10 || create.isPending} onClick={() => create.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" />
              {create.isPending ? t('consulting.sending') : t('consulting.submit')}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t('consulting.noRequests')}</p>
            <p className="text-sm mt-1">{t('consulting.noRequestsDesc')}</p>
          </div>
        ) : (
          requests.map(req => {
            const isExpanded = expandedId === req.id
            const messages = Array.isArray(req.messages) ? req.messages : []
            return (
              <div key={req.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      req.priority === 'high' ? 'bg-red-100 text-red-700' :
                      req.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{t(`consulting.${req.priority}Priority`)}</span>
                    <div className="text-left">
                      <p className="font-medium text-sm line-clamp-1">{req.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(req.created_at)} · {t(`consulting.messageCount_${messages.length === 1 ? 'one' : 'other'}`, { count: messages.length })}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <ConversationThread req={req} currentUserEmail={user?.email ?? ''} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}