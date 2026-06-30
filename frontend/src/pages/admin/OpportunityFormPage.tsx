import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { FUNDING_TYPES, SECTORS } from '@/lib/constants'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { extractError } from '@/utils/extractError'

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
  sector_other: string
  url: string
}

const DEFAULT_FORM: FormState = {
  title: '',
  source: '',
  description: '',
  country: 'Mauritania',
  amount: '',
  currency: 'USD',
  deadline: '',
  eligibility_criteria: '',
  required_documents: '',
  funding_type: 'grant',
  sector: '',
  sector_other: '',
  url: '',
}

export function OpportunityFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [error, setError] = useState('')

  useQuery({
    queryKey: ['admin-opportunity', id],
    queryFn: () =>
      api.get(`/opportunities/admin/${id}/`).then((r) => {
        const d = r.data
        const knownSector = SECTORS.some((s) => s.value === d.sector)
        setForm({
          title: d.title || '',
          source: d.source || '',
          description: d.description || '',
          country: d.country || 'Mauritania',
          amount: d.amount != null ? String(d.amount) : '',
          currency: d.currency || 'USD',
          deadline: d.deadline || '',
          eligibility_criteria: d.eligibility_criteria || '',
          required_documents: d.required_documents || '',
          funding_type: d.funding_type || 'grant',
          sector: knownSector ? d.sector : d.sector ? 'other' : '',
          sector_other: knownSector ? '' : d.sector || '',
          url: d.url || '',
        })
        return d
      }),
    enabled: isEdit,
  })

  const effectiveSector = form.sector === 'other' ? form.sector_other : form.sector

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        source: form.source,
        description: form.description,
        country: form.country,
        amount: form.amount ? Number(form.amount) : null,
        currency: form.currency,
        deadline: form.deadline,
        eligibility_criteria: form.eligibility_criteria,
        required_documents: form.required_documents,
        funding_type: form.funding_type,
        sector: effectiveSector,
        url: form.url || '',
        status: 'published',
      }
      return isEdit
        ? api.patch(`/opportunities/admin/${id}/`, payload)
        : api.post('/opportunities/admin/', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] })
      navigate('/admin/opportunities')
    },
    onError: (err: unknown) => {
      setError(extractError(err, t('errors.submitFailed')))
    },
  })

  const handleInputChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const isValid = form.title && form.source && form.amount && form.deadline

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('common.back')}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? t('common.edit') : t('admin.addOpportunity')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEdit
            ? t('opportunities.editDesc')
            : t('opportunities.newDesc')}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t('common.title')} <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.title}
            onChange={handleInputChange('title')}
            placeholder={t('opportunities.titlePlaceholder')}
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t('common.source')} <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.source}
            onChange={handleInputChange('source')}
            placeholder={t('opportunities.sourcePlaceholder')}
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('opportunities.sourceHint')}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">
              {t('common.amount')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step={1000}
              required
              value={form.amount}
              onChange={handleInputChange('amount')}
              placeholder="1000000"
              className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('opportunities.currency')}</label>
            <input
              value={form.currency}
              onChange={handleInputChange('currency')}
              className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t('opportunities.deadline')} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={form.deadline}
            onChange={handleInputChange('deadline')}
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('opportunities.deadlineHint')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('opportunities.fundingType')}</label>
          <select
            value={form.funding_type}
            onChange={handleInputChange('funding_type')}
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {FUNDING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('common.sector')}</label>
          <select
            value={form.sector}
            onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value, sector_other: '' }))}
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="">{t('profile.selectSector')}</option>
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
            <option value="other">{t('profile.other')}</option>
          </select>
          {form.sector === 'other' && (
            <input
              value={form.sector_other}
              onChange={handleInputChange('sector_other')}
              placeholder={t('profile.specifySector')}
              className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('common.country')}</label>
          <input
            value={form.country}
            onChange={handleInputChange('country')}
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t('opportunities.originalSource')}
          </label>
          <input
            type="url"
            value={form.url}
            onChange={handleInputChange('url')}
            placeholder="https://..."
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('common.description')}</label>
          <textarea
            rows={5}
            value={form.description}
            onChange={handleInputChange('description')}
            className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('opportunities.eligibility')}</label>
          <textarea
            rows={4}
            value={form.eligibility_criteria}
            onChange={handleInputChange('eligibility_criteria')}
            className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('opportunities.requiredDocuments')}</label>
          <textarea
            rows={3}
            value={form.required_documents}
            onChange={handleInputChange('required_documents')}
            className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={() => {
              setError('')
              saveMutation.mutate()
            }}
            disabled={saveMutation.isPending || !isValid}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending
              ? t('common.loading')
              : isEdit
              ? t('common.save')
              : t('opportunities.publish')}
          </button>
        </div>
      </div>
    </div>
  )
}