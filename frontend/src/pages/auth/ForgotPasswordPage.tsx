import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/password-reset/', { email })
      setSent(true)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } }
      setError(ax.response?.data?.error?.message || t('errors.submitFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-xl mb-4">R</div>
          <h2 className="text-2xl font-bold tracking-tight">{t('auth.forgotPasswordTitle')}</h2>
          <p className="mt-2 text-muted-foreground text-sm">{t('auth.forgotPasswordDesc')}</p>
        </div>
        {sent ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 text-center">
            {t('auth.resetLinkSent', { email })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('auth.email')}</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@company.mr" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {loading ? t('auth.sending') : t('auth.sendResetLink')}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">← {t('auth.backToLogin')}</Link>
        </p>
      </div>
    </div>
  )
}