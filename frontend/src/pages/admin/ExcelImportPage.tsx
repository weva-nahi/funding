import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportResult {
  created: number
  skipped: number
}

const SAMPLE_COLUMNS = [
  { col: 'title', desc: 'opportunities.title', required: true, example: 'GEF Solar Initiative – Mauritania' },
  { col: 'source', desc: 'common.source', required: false, example: 'GEF' },
  { col: 'amount', desc: 'common.amount', required: false, example: '1500000' },
  { col: 'currency', desc: 'opportunities.currency', required: false, example: 'USD' },
  { col: 'deadline', desc: 'opportunities.deadline', required: false, example: '2026-12-31' },
  { col: 'description', desc: 'common.description', required: false, example: 'Climate resilience project…' },
  { col: 'funding_type', desc: 'opportunities.fundingType', required: false, example: 'grant' },
  { col: 'sector', desc: 'common.sector', required: false, example: 'energy' },
  { col: 'country', desc: 'common.country', required: false, example: 'Mauritania' },
  { col: 'url', desc: 'opportunities.originalSource', required: false, example: 'https://thegef.org/…' },
  { col: 'eligibility_criteria', desc: 'opportunities.eligibility', required: false, example: 'Registered businesses…' },
]

export function ExcelImportPage() {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const onDrop = (accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setError('')
      setResult(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/opportunities/admin/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      setFile(null)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } }
      setError(
        ax.response?.data?.error?.message ||
          t('errors.submitFailed')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('adminNav.excelImport')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('opportunities.importDesc')}
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-sm">{t('opportunities.importFormat')}</h2>
        <p className="text-xs text-muted-foreground">
          {t('opportunities.importFormatDesc')}
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-start font-semibold text-muted-foreground">
                  {t('opportunities.columnName')}
                </th>
                <th className="px-4 py-2 text-start font-semibold text-muted-foreground">
                  {t('common.description')}
                </th>
                <th className="px-4 py-2 text-start font-semibold text-muted-foreground">
                  {t('opportunities.required')}
                </th>
                <th className="px-4 py-2 text-start font-semibold text-muted-foreground">
                  {t('opportunities.example')}
                </th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_COLUMNS.map((c) => (
                <tr key={c.col} className="border-t">
                  <td className="px-4 py-2 font-mono font-medium">{c.col}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {t(c.desc)}
                  </td>
                  <td className="px-4 py-2">
                    {c.required ? (
                      <span className="text-red-600 font-semibold">{t('common.yes')}</span>
                    ) : (
                      <span className="text-muted-foreground">{t('common.no')}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground font-mono">
                    {c.example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('opportunities.importNote')}
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div
          {...getRootProps()}
          className={`rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/30 hover:border-primary/50 bg-muted/20'
          }`}
        >
          <input {...getInputProps()} />
          <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {file ? file.name : t('opportunities.uploadFile')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {file
              ? `${(file.size / 1024).toFixed(1)} KB`
              : t('opportunities.dragDrop')}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
            <h3 className="text-lg font-bold text-emerald-800">
              {t('opportunities.importSuccess')}
            </h3>
            <p className="text-emerald-700">
              {result.created} {t('opportunities.created')} · {result.skipped} {t('opportunities.skipped')}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {loading ? t('common.loading') : t('opportunities.startImport')}
          </button>
        </div>
      </div>
    </div>
  )
}