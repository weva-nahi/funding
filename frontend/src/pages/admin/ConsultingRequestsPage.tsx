import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatDate, formatRelativeDate } from '@/utils/formatDate'
import { Send, Paperclip, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { Paginated } from '@/types'

interface ConsultingMessage {
  id: number
  sender_email: string
  sender_role: string
  content: string
  attachment: string | null
  attachment_name: string
  created_at: string
}

interface ConsultingReq {
  id: number
  user_email: string
  company: string
  description: string
  priority: string
  status: string
  messages: ConsultingMessage[] | null | undefined
  created_at: string
}

function AdminConversation({ req }: { req: ConsultingReq }) {
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
      return api.post(`/consulting/admin/${req.id}/messages/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      setMessage('')
      setAttachment(null)
      queryClient.invalidateQueries({ queryKey: ['admin-consulting'] })
    },
  })

  return (
    <div className="flex flex-col border-t">
      <div className="overflow-y-auto p-4 space-y-3 max-h-72">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No messages yet. Start the conversation below.</p>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender_role === 'admin'
            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isAdmin
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {!isAdmin && (
                    <p className="text-[10px] font-semibold mb-1 opacity-70">{msg.sender_email}</p>
                  )}
                  {msg.content && <p>{msg.content}</p>}
                  {msg.attachment_name && (
                    <a
                      href={msg.attachment || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 mt-1 underline text-xs opacity-80"
                    >
                      <Paperclip className="h-3 w-3" />
                      {msg.attachment_name}
                    </a>
                  )}
                  <p
                    className={`text-[10px] mt-1 ${
                      isAdmin ? 'opacity-70 text-right' : 'text-muted-foreground'
                    }`}
                  >
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
            <button onClick={() => setAttachment(null)}>
              <X className="h-3 w-3 text-red-500" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border p-2.5 hover:bg-muted transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && (message.trim() || attachment)) {
                e.preventDefault()
                sendMessage.mutate()
              }
            }}
            placeholder="Write a message…"
            className="flex-1 rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => sendMessage.mutate()}
            disabled={sendMessage.isPending || (!message.trim() && !attachment)}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConsultingRequestsPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">Consulting Requests</h1>
        <p className="text-muted-foreground mt-1">Manage client advisory conversations</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="h-32 rounded-xl border bg-muted animate-pulse" />
        ) : isError ? (
          <div className="text-center p-8 text-red-600 bg-white border rounded-xl">
            Failed to load requests.
          </div>
        ) : (data?.results?.length ?? 0) === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-white border rounded-xl">
            No consulting requests found.
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
                      {req.priority}
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
                      {messages.length} msg{messages.length !== 1 ? 's' : ''}
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
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.next}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
