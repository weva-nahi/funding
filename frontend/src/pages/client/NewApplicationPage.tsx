import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { extractError } from '@/utils/extractError'
import { useDropzone } from 'react-dropzone'
import { CharCounter } from '@/components/CharCounter'
import { FileText, Upload, ArrowLeft, Send, Trash2, RefreshCw } from 'lucide-react'
import type { Opportunity, Application } from '@/types'

const MOTIVATION_MAX = 2000
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_BYTES = 20 * 1024 * 1024

function draftLetterKey(oppId: string) {
  return `richat:draft-letter:opp-${oppId}`
}

function draftAppIdKey(oppId: string) {
  return `richat:draft-appid:opp-${oppId}`
}

export function NewApplicationPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  const [letter, setLetter] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [appId, setAppId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [resuming, setResuming] = useState(false)

  const { data: opp } = useQuery<Opportunity>({
    queryKey: ['opportunity', id],
    queryFn: () => api.get(`/opportunities/${id}/`).then((r) => r.data),
  })

  const { data: existingApps } = useQuery<{ results: Application[] }>({
    queryKey: ['my-applications-for-opp', id],
    queryFn: () => api.get('/applications/').then(r => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    if (!id) return

    const savedAppId = localStorage.getItem(draftAppIdKey(id))
    if (savedAppId) {
      const parsedId = parseInt(savedAppId)
      if (!isNaN(parsedId)) {
        setAppId(parsedId)
        setStep(2)
        setResuming(true)
      }
    }

    const saved = localStorage.getItem(draftLetterKey(id))
    if (saved) setLetter(saved)
  }, [id])

  useEffect(() => {
    if (!id || !existingApps) return
    const existing = existingApps.results?.find(a =>
      String(a.opportunity_id) === id ||
      a.opportunity_title === opp?.title
    )
    if (existing && !appId) {
      setAppId(existing.id)
      if (existing.status === 'pending') {
        navigate('/applications')
      }
    }
  }, [existingApps, id, opp, appId, navigate])

  useEffect(() => {
    if (!id || step !== 2) return
    if (letter) {
      localStorage.setItem(draftLetterKey(id), letter)
    } else {
      localStorage.removeItem(draftLetterKey(id))
    }
  }, [letter, id, step])

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/applications/', { opportunity_id: parseInt(id!) }),
    onSuccess: (res) => {
      setError('')
      const newAppId = res.data.id
      setAppId(newAppId)
      if (id) localStorage.setItem(draftAppIdKey(id), String(newAppId))
      setStep(2)
    },
    onError: (err: unknown) => {
      const errMsg = extractError(err, t('errors.submitFailed'))
      if (errMsg.includes('already have') || errMsg.includes('already applied')) {
        navigate('/applications')
      } else {
        setError(errMsg)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/applications/${appId}/`, { motivation_letter: letter }),
    onSuccess: () => {
      setError('')
      setStep(3)
    },
    onError: (err: unknown) =>
      setError(extractError(err, t('errors.submitFailed'))),
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('application_id', String(appId))
        await api.post('/documents/upload/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
    },
    onSuccess: () => {
      if (id) {
        localStorage.removeItem(draftLetterKey(id))
        localStorage.removeItem(draftAppIdKey(id))
      }
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      navigate('/applications')
    },
    onError: (err: unknown) =>
      setError(extractError(err, t('errors.submitFailed'))),
  })

  const totalSize = files.reduce((s, f) => s + f.size, 0)

  const onDrop = useCallback(
    (accepted: File[]) => {
      for (const f of accepted) {
        if (f.type !== 'application/pdf') {
          setError(`"${f.name}" is not a PDF. Only PDF files are accepted.`)
          return
        }
        if (f.size > MAX_FILE_BYTES) {
          setError(`"${f.name}" exceeds the 5 MB limit.`)
          return
        }
        if (totalSize + f.size > MAX_TOTAL_BYTES) {
          setError('Total file size would exceed the 20 MB limit.')
          return
        }
      }
      setFiles((prev) => [...prev, ...accepted])
      setError('')
    },
    [totalSize]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  const steps = [
    { num: 1, label: t('applications.stepConfirm') },
    { num: 2, label: t('applications.stepMotivation') },
    { num: 3, label: t('applications.stepDocuments') },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </button>

      <h1 className="text-2xl font-bold">{t('applications.applyFor', { title: opp?.title })}</h1>

      <div className="flex items-center gap-2">
        {steps.map(({ num, label }, i) => (
          <div key={num} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step >= num ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
            }`}>{num}</div>
            <span className={`text-sm hidden sm:inline ${step >= num ? 'font-medium' : 'text-muted-foreground'}`}>
              {label}
            </span>
            {i < 2 && <div className={`h-0.5 w-8 ${step > num ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {resuming && step === 2 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 flex-shrink-0" />
          {t('applications.resuming')}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-4 text-center">
            <FileText className="mx-auto h-12 w-12 text-primary opacity-60" />
            <h2 className="text-lg font-semibold">{t('applications.readyToApply')}</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {t('applications.readyDesc', { title: opp?.title })}
            </p>
            <button
              onClick={() => { setError(''); createMutation.mutate() }}
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? t('applications.starting') : t('applications.startApplication')}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('applications.motivationLetter')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('applications.motivationDesc')}
            </p>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value.slice(0, MOTIVATION_MAX))}
              rows={10}
              placeholder={t('applications.motivationPlaceholder')}
              className="w-full rounded-lg border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex justify-end">
              <CharCounter current={letter.length} max={MOTIVATION_MAX} />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={!letter.trim() || updateMutation.isPending}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {updateMutation.isPending ? t('applications.saving') : t('applications.continue')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('applications.uploadDocuments')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('applications.uploadDesc')}
            </p>
            <div
              {...getRootProps()}
              className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? t('applications.dropFilesActive') : t('applications.dropFiles')}
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm">{f.name}</span>
                      <span className="text-xs text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-right">
                  {t('applications.total')}: {(totalSize / 1024 / 1024).toFixed(1)} MB / 20 MB
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t">
              <button onClick={() => setStep(2)}
                className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted">← {t('common.back')}</button>
              <button
                onClick={() => { setError(''); submitMutation.mutate() }}
                disabled={submitMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitMutation.isPending ? t('applications.submitting') : t('applications.submitApplication')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}