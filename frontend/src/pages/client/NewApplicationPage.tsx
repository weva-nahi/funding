import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { extractError } from '@/utils/extractError'
import { useDropzone } from 'react-dropzone'
import { validateFile } from '@/utils/validateFile'
import { FileText, Upload, ArrowLeft, Send, Trash2 } from 'lucide-react'
import type { Opportunity } from '@/types'

export function NewApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [letter, setLetter] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [appId, setAppId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const { data: opp } = useQuery<Opportunity>({
    queryKey: ['opportunity', id],
    queryFn: () => api.get(`/opportunities/${id}/`).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/applications/', { opportunity_id: parseInt(id!) }),
    onSuccess: (res) => {
      setError('')
      setAppId(res.data.id)
      setStep(2)
    },
    onError: (err: unknown) => {
      setError(extractError(err, 'Failed to create application.'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/applications/${appId}/`, { motivation_letter: letter }),
    onSuccess: () => {
      setError('')
      setStep(3)
    },
    onError: (err: unknown) => {
      setError(extractError(err, 'Failed to save letter.'))
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('application_id', String(appId))
        await api.post('/documents/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      await api.post(`/applications/${appId}/submit/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      navigate('/applications')
    },
    onError: (err: unknown) => {
      setError(extractError(err, 'Submission failed.'))
    },
  })

  const onDrop = useCallback((accepted: File[]) => {
    for (const file of accepted) {
      const { valid, error: ferr } = validateFile(file)
      if (!valid) { setError(ferr!); return }
    }
    setFiles(prev => [...prev, ...accepted])
    setError('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
  })

  const goToStep = (n: number) => {
    setError('')  // Reset error state between steps
    setStep(n)
  }

  const steps = [{ num: 1, label: 'Start' }, { num: 2, label: 'Motivation' }, { num: 3, label: 'Documents' }]

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-bold">Apply: {opp?.title}</h1>

      <div className="flex items-center gap-2">
        {steps.map(({ num, label }, i) => (
          <div key={num} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= num ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{num}</div>
            <span className={`text-sm hidden sm:inline ${step >= num ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {i < 2 && <div className={`h-0.5 w-8 ${step > num ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-4 text-center">
            <FileText className="mx-auto h-12 w-12 text-primary opacity-60" />
            <h2 className="text-lg font-semibold">Ready to apply?</h2>
            <p className="text-muted-foreground text-sm">
              This will create a draft application for "{opp?.title}". You can edit it before submitting.
            </p>
            <button onClick={() => { setError(''); createMutation.mutate() }} disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Draft Application'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Motivation Letter</h2>
            <p className="text-sm text-muted-foreground">Explain why your organization is a good fit for this funding.</p>
            <textarea value={letter} onChange={e => setLetter(e.target.value)} rows={10}
              placeholder="Write your motivation letter..."
              className="w-full rounded-lg border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            <p className="text-xs text-muted-foreground">{letter.length} characters</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => updateMutation.mutate()} disabled={!letter.trim() || updateMutation.isPending}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
                {updateMutation.isPending ? 'Saving...' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Upload Documents</h2>
            <p className="text-sm text-muted-foreground">Attach supporting documents (PDF, JPEG, PNG — max 10MB each).</p>
            <div {...getRootProps()} className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}`}>
              <input {...getInputProps()} />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Drop files here...' : 'Drag & drop files or click to browse'}
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
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button onClick={() => goToStep(2)} className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted">← Back</button>
              <button onClick={() => { setError(''); submitMutation.mutate() }} disabled={submitMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
                <Send className="h-4 w-4" /> {submitMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}