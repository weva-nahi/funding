import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { formatDate, formatRelativeDate } from '@/utils/formatDate'
import { useAuthStore } from '@/store'
import { ArrowLeft, Download, Clock, Send, Paperclip, X } from 'lucide-react'
import type { Application, ApplicationDocument } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  shortlisted: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

interface Message {
  id: number
  sender_email: string
  sender_role: string
  content: string
  attachment: string | null
  attachment_name: string
  created_at: string
}

export function ApplicationDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: app, isLoading } = useQuery<Application>({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}/`).then((r) => r.data),
  })

  const { data: docs } = useQuery<ApplicationDocument[]>({
    queryKey: ['app-documents', id],
    queryFn: () => api.get(`/documents/application/${id}/`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: messages } = useQuery<Message[]>({
    queryKey: ['app-messages', id],
    queryFn: () => api.get(`/applications/${id}/messages/`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 10000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      if (message.trim()) fd.append('content', message)
      if (attachment) fd.append('attachment', attachment)
      return api.post(`/applications/${id}/messages/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      setMessage('')
      setAttachment(null)
      queryClient.invalidateQueries({ queryKey: ['app-messages', id] })
    },
  })

  const getSignedUrl = async (docId: number, filename: string) => {
    try {
      const res = await api.get(`/documents/${docId}/signed-url/`)
      const a = document.createElement('a')
      a.href = res.data.url
      a.download = filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      alert(t('applications.couldNotGenerateLink'))
    }
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  if (!app) return null

  const statusColor = STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('common.back')}
      </button>

      <div className="rounded-xl border bg-white shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">{app.opportunity_title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('applications.applicationNum', { id: app.id })} · {t('applications.submitted')} {formatDate(app.created_at)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusColor}`}>
            {t(`applications.statuses.${app.status}`)}
          </span>
        </div>

        {app.motivation_letter && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">{t('applications.motivationLetter')}</h3>
            <div
              className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: app.motivation_letter }}
            />
          </div>
        )}

        {app.admin_comment && (
          <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <h3 className="text-sm font-semibold text-emerald-800 mb-1">{t('applications.adminComment')}</h3>
            <p className="text-sm text-emerald-700">{app.admin_comment}</p>
          </div>
        )}
        {app.rejection_reason && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-1">{t('applications.rejectionReason')}</h3>
            <p className="text-sm text-red-700">{app.rejection_reason}</p>
          </div>
        )}

        {(docs?.length ?? 0) > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">{t('applications.documents')} ({docs?.length})</h3>
            <div className="space-y-2">
              {docs?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">{doc.original_filename}</span>
                  <button
                    onClick={() => getSignedUrl(doc.id, doc.original_filename)}
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> {t('applications.download')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(app.status_history?.length ?? 0) > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3">{t('applications.timeline')}</h3>
            <div className="space-y-3 relative before:absolute before:start-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
              {app.status_history?.map((entry) => (
                <div key={entry.id} className="flex gap-4 relative">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center z-10 mt-0.5">
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : entry.to_status}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeDate(entry.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm flex flex-col">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">{t('applications.conversation')}</h2>
          <p className="text-xs text-muted-foreground">{t('applications.conversationDesc')}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-80">
          {(messages?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t('applications.noMessages')}
            </p>
          ) : (
            messages?.map((msg) => {
              const isMe = msg.sender_email === user?.email
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-[10px] font-semibold mb-1 opacity-70">
                        {msg.sender_role === 'admin' ? t('applications.richatTeam') : msg.sender_email}
                      </p>
                    )}
                    {msg.content && <p>{msg.content}</p>}
                    
                    {/* FIXED: Properly wrapped attachment link with <a> tag */}
                    {msg.attachment_name && (
                      <a
                        href={msg.attachment || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 mt-1 underline text-xs opacity-80 hover:opacity-100"
                      >
                        <Paperclip className="h-3 w-3" />
                        {msg.attachment_name}
                      </a>
                    )}
                    
                    <p
                      className={`text-[10px] mt-1 ${
                        isMe ? 'opacity-70 text-right' : 'text-muted-foreground'
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

        <div className="border-t p-4">
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
              placeholder={t('applications.writeMessage')}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => sendMessage.mutate()}
              disabled={sendMessage.isPending || (!message.trim() && !attachment)}
              className="rounded-lg bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}