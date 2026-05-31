import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { SOURCES, FUNDING_TYPES } from '@/lib/constants'
import { ArrowLeft, Save, Globe } from 'lucide-react'

export function OpportunityFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    title: '', source: 'GEF', description: '', country: '', amount: '', currency: 'USD',
    deadline: '', eligibility_criteria: '', required_documents: '', funding_type: 'grant',
    sector: '', url: '', status: 'draft'
  })

  useQuery({
    queryKey: ['admin-opportunity', id],
    queryFn: () => api.get(`/opportunities/admin/${id}/`).then(r => {
      setForm({
        ...r.data,
        amount: r.data.amount || '',
        deadline: r.data.deadline || '',
      })
      return r.data
    }),
    enabled: isEdit,
  })

  const mutation = useMutation({
    mutationFn: () => isEdit ? api.patch(`/opportunities/admin/${id}/`, form) : api.post('/opportunities/admin/', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] })
      navigate('/admin/opportunities')
    }
  })

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/opportunities/admin/${id}/publish/`),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] })
       navigate('/admin/opportunities')
    }
  })

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {isEdit && form.status === 'draft' && (
          <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            <Globe className="h-4 w-4" /> Publish Now
          </button>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit Opportunity' : 'New Opportunity'}</h1>
        <p className="text-muted-foreground mt-1">Fill in the details below</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">Source *</label>
            <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium mb-1.5">Sector</label>
             <input value={form.sector} onChange={e => setForm({...form, sector: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Energy, Agriculture" />
          </div>

          <div>
             <label className="block text-sm font-medium mb-1.5">Amount</label>
             <div className="flex gap-2">
               <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="1000000" />
               <input value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-20 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center" />
             </div>
          </div>

          <div>
             <label className="block text-sm font-medium mb-1.5">Deadline</label>
             <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Funding Type</label>
            <select value={form.funding_type} onChange={e => setForm({...form, funding_type: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
              {FUNDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium mb-1.5">Target Country / Region</label>
             <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="sm:col-span-2">
             <label className="block text-sm font-medium mb-1.5">Original URL</label>
             <input type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="https://..." />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea rows={5} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Eligibility Criteria</label>
            <textarea rows={4} value={form.eligibility_criteria} onChange={e => setForm({...form, eligibility_criteria: e.target.value})} className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
          </div>

          <div className="sm:col-span-2">
             <label className="block text-sm font-medium mb-1.5">Status</label>
             <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title}
             className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
             <Save className="h-4 w-4" /> {mutation.isPending ? 'Saving...' : 'Save Opportunity'}
          </button>
        </div>
      </div>
    </div>
  )
}
