import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { formatDate, formatRelativeDate } from '@/utils/formatDate'
import { extractError } from '@/utils/extractError'
import { ArrowLeft, Clock, Lock, CheckCircle, XCircle, Star, Send, Paperclip, Download } from 'lucide-react'
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

export function ApplicationDetailAdminPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'shortlist' | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)

  const { data: app, isLoading } = useQuery<Application>({
    queryKey: ['admin-application-detail', id],
    queryFn: () => api.get(`/applications/admin/${id}/`).then(r => r.data),
  })

  const { data: docs } = useQuery<ApplicationDocument[]>({
    queryKey: ['admin-app-documents', id],
    queryFn: () => api.get(`/documents/application/${id}/`).then(r => r.data),
    enabled: !!id,
  })

  const { data: messages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['admin-app-messages', id],
    queryFn: () => api.get(`/applications/admin/${id}/messages/`).then(r => r.data),
    enabled: !!id,
    refetchInterval: 10000,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ action, comment }: { action: string; comment: string }) =>
      api.post(`/applications/admin/${id}/review/`, {
        action,
        comment: action !== 'reject' ? comment : undefined,
        reason: action === 'reject' ? comment : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-application-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      setReviewAction(null)
      setReviewComment('')
      setShowPasswordDialog(false)
      setAdminPassword('')
      setPasswordError('')
    },
    onError: (err: unknown) => setPasswordError(extractError(err, t('errors.submitFailed'))),
  })

  const needsPasswordConfirmation = (action: string) => action === 'approve' || action === 'reject'

  const handleReviewSubmit = async () => {
    if (!reviewAction) return
    if (needsPasswordConfirmation(reviewAction)) {
      setShowPasswordDialog(true)
      return
    }
    reviewMutation.mutate({ action: reviewAction, comment: reviewComment })
  }

  const verifyAndReview = async () => {
    if (!reviewAction) return
    setPasswordError('')
    try {
      const res = await api.post('/auth/verify-admin-password/', { password: adminPassword })
      if (res.data.success) {
        reviewMutation.mutate({ action: reviewAction, comment: reviewComment })
      } else {
        setPasswordError(t('auth.passwordsNoMatch'))
      }
    } catch {
      setPasswordError(t('auth.passwordsNoMatch'))
    }
  }

  const sendMessage = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      if (message.trim()) fd.append('content', message)
      if (attachment) fd.append('attachment', attachment)
      return api.post(`/applications/admin/${id}/messages/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      setMessage('')
      setAttachment(null)
      queryClient.invalidateQueries({ queryKey: ['admin-app-messages', id] })
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

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (!app) return null

  const canReview = app.status === 'pending' || app.status === 'shortlisted'
  const canShortlist = app.status === 'pending'

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('common.back')}
      </button>

      <div className="rounded-xl border bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">{app.opportunity_title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{app.user_email} · {formatDate(app.created_at)}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'}`}>
            {t(`applications.statuses.${app.status}`)}
          </span>
        </div>

        {app.motivation_letter && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">{t('applications.motivationLetter')}</h3>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: app.motivation_letter }} />
          </div>
        )}

        {(docs?.length ?? 0) > 0 && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> {t('applications.documents')} ({docs?.length})
            </h3>
            <div className="space-y-2">
              {docs?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.file_size / 1024).toFixed(0)} KB · {doc.file_type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => getSignedUrl(doc.id, doc.original_filename)}
                    className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> {t('applications.download')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {app.admin_comment && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <h3 className="text-sm font-semibold text-emerald-800 mb-1">{t('applications.adminComment')}</h3>
            <p className="text-sm text-emerald-700">{app.admin_comment}</p>
          </div>
        )}
        {app.rejection_reason && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-1">{t('applications.rejectionReason')}</h3>
            <p className="text-sm text-red-700">{app.rejection_reason}</p>
          </div>
        )}

        {(app.status_history?.length ?? 0) > 0 && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3">{t('applications.timeline')}</h3>
            <div className="space-y-3 relative before:absolute before:start-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
              {app.status_history?.map(entry => (
                <div key={entry.id} className="flex gap-4 relative">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center z-10 mt-0.5">
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : entry.to_status}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeDate(entry.created_at)}</p>
                    {entry.comment && (
                      <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2">{entry.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {canReview && !reviewAction && (
          <div className="pt-4 border-t space-y-3">
            <h3 className="text-sm font-semibold">{t('common.actions')}</h3>
            <div className="flex flex-wrap gap-3">
              {canShortlist && (
                <button onClick={() => setReviewAction('shortlist')}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700">
                  <Star className="h-4 w-4" /> {t('applications.statuses.shortlisted')}
                </button>
              )}
              <button onClick={() => setReviewAction('approve')}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4" /> {t('applications.statuses.approved')}
              </button>
              <button onClick={() => setReviewAction('reject')}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700">
                <XCircle className="h-4 w-4" /> {t('applications.statuses.rejected')}
              </button>
            </div>
          </div>
        )}

        {reviewAction && (
          <div className="pt-4 border-t space-y-3">
            <h3 className="text-sm font-semibold">
              {reviewAction === 'shortlist' ? t('applications.statuses.shortlisted') :
               reviewAction === 'approve' ? t('applications.statuses.approved') : t('applications.statuses.rejected')}
            </h3>
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder={reviewAction === 'reject' ? t('applications.rejectionReason') : t('common.description')}
              className="w-full rounded-lg border p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setReviewAction(null); setReviewComment('') }}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">{t('common.cancel')}</button>
              <button onClick={handleReviewSubmit} disabled={reviewMutation.isPending}
                className={`rounded-lg px-6 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-indigo-600 hover:bg-indigo-700'
                }`}>
                {needsPasswordConfirmation(reviewAction) ? t('common.confirm') : t('common.confirm')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm flex flex-col">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">{t('applications.conversation')}</h2>
          <p className="text-xs text-muted-foreground">{t('applications.conversationDescAdmin')}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-80">
          {(messages?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">{t('applications.noMessages')}</p>
          ) : (
            messages?.map(msg => {
              const isAdmin = msg.sender_role === 'admin'
              return (
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isAdmin ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                  }`}>
                    {!isAdmin && <p className="text-[10px] font-semibold mb-1 opacity-70">{msg.sender_email}</p>}
                    {msg.content && <p>{msg.content}</p>}
                    {msg.attachment_name && (
                      <a href={msg.attachment || '#'} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 mt-1 underline text-xs opacity-80">
                        <Paperclip className="h-3 w-3" />{msg.attachment_name}
                      </a>
                    )}
                    <p className={`text-[10px] mt-1 ${isAdmin ? 'opacity-70 text-right' : 'text-muted-foreground'}`}>
                      {formatRelativeDate(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="border-t p-4">
          {attachment && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" /><span>{attachment.name}</span>
              <button onClick={() => setAttachment(null)}><XCircle className="h-3 w-3 text-red-500" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <label className="cursor-pointer rounded-lg border p-2.5 hover:bg-muted transition-colors" title="Attach file">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <input type="file" accept="application/pdf,image/*" className="hidden"
                onChange={e => setAttachment(e.target.files?.[0] ?? null)} />
            </label>
            <input type="text" value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && (message.trim() || attachment)) { e.preventDefault(); sendMessage.mutate() } }}
              placeholder={t('applications.writeMessage')}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={() => sendMessage.mutate()}
              disabled={sendMessage.isPending || (!message.trim() && !attachment)}
              className="rounded-lg bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold">{t('common.confirm')}</h2>
                <p className="text-xs text-muted-foreground">{t('common.confirm')}</p>
              </div>
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') verifyAndReview() }}
              placeholder={t('auth.password')} autoFocus
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowPasswordDialog(false); setAdminPassword(''); setPasswordError('') }}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">{t('common.cancel')}</button>
              <button onClick={verifyAndReview} disabled={!adminPassword || reviewMutation.isPending}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {reviewMutation.isPending ? t('common.processing') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}