import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { SOURCES, FUNDING_TYPES } from '@/lib/constants'
import { ArrowLeft, Save, Globe, AlertCircle } from 'lucide-react'

interface FormState {
  title: string
  source: string
  description: string
  country: string
  amount: string
  currency: string
  deadline: string
  eligibility_criteria: string
  required_documents: string
  funding_type: string
  sector: string
  url: string
  status: string
}

const DEFAULT_FORM: FormState = {
  title: '', source: 'GEF', description: '', country: '', amount: '', currency: 'USD',
  deadline: '', eligibility_criteria: '', required_documents: '', funding_type: 'grant',
  sector: '', url: '', status: 'draft',
}

function extractError(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { error?: { message?: string } } } }
  return ax.response?.data?.error?.message || fallback
}

export function OpportunityFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [error, setError] = useState('')

  useQuery({
    queryKey: ['admin-opportunity', id],
    queryFn: () => api.get(`/opportunities/admin/${id}/`).then(r => {
      const d = r.data
      setForm({
        title: d.title || '',
        source: d.source || 'GEF',
        description: d.description || '',
        country: d.country || '',
        amount: d.amount != null ? String(d.amount) : '',
        currency: d.currency || 'USD',
        deadline: d.deadline || '',
        eligibility_criteria: d.eligibility_criteria || '',
        required_documents: d.required_documents || '',
        funding_type: d.funding_type || 'grant',
        sector: d.sector || '',
        url: d.url || '',
        status: d.status || 'draft',
      })
      return d
    }),
    enabled: isEdit,
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, amount: form.amount ? Number(form.amount) : null }
      return isEdit
        ? api.patch(`/opportunities/admin/${id}/`, payload)
        : api.post('/opportunities/admin/', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] })
      navigate('/admin/opportunities')
    },
    onError: (err: unknown) => {
      setError(extractError(err, 'Failed to save the opportunity. Please try again.'))
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/opportunities/admin/${id}/publish/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] })
      navigate('/admin/opportunities')
    },
    onError: (err: unknown) => {
      setError(extractError(err, 'Failed to publish the opportunity. Please try again.'))
    },
  })

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {isEdit && form.status === 'draft' && (
          <button onClick={() => { setError(''); publishMutation.mutate() }} disabled={publishMutation.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            <Globe className="h-4 w-4" /> Publish Now
          </button>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit Opportunity' : 'New Opportunity'}</h1>
        <p className="text-muted-foreground mt-1">Fill in the details below</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <input required value={form.title} onChange={set('title')}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Source *</label>
            <select value={form.source} onChange={set('source')}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sector</label>
            <input value={form.sector} onChange={set('sector')}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Energy, Agriculture" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <div className="flex gap-2">
              <input type="number" value={form.amount} onChange={set('amount')}
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1000000" />
              <input value={form.currency} onChange={set('currency')}
                className="w-20 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Deadline</label>
            <input type="date" value={form.deadline} onChange={set('deadline')}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Funding Type</label>
            <select value={form.funding_type} onChange={set('funding_type')}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
              {FUNDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Target Country / Region</label>
            <input value={form.country} onChange={set('country')}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Original URL</label>
            <input type="url" value={form.url} onChange={set('url')}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea rows={5} value={form.description} onChange={set('description')}
              className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Eligibility Criteria</label>
            <textarea rows={4} value={form.eligibility_criteria} onChange={set('eligibility_criteria')}
              className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Required Documents</label>
            <textarea rows={3} value={form.required_documents} onChange={set('required_documents')}
              className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <select value={form.status} onChange={set('status')}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <button onClick={() => { setError(''); saveMutation.mutate() }} disabled={saveMutation.isPending || !form.title}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Opportunity'}
          </button>
        </div>
      </div>
    </div>
  )
}