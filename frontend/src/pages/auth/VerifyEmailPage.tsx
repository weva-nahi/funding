import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/lib/axios'

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const { token } = useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  )
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>(
    'idle'
  )

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }
    api
      .get(`/auth/verify-email/${token}/`)
      .then(() => {
        setStatus('success')
        setMessage(t('auth.emailVerified'))
      })
      .catch((err: unknown) => {
        const ax = err as { response?: { data?: { error?: { message?: string } } } }
        setStatus('error')
        setMessage(
          ax.response?.data?.error?.message ||
            t('auth.verificationFailed')
        )
      })
  }, [token, t])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail) return
    setResendStatus('sending')
    try {
      await api.post('/auth/resend-verification/', { email: resendEmail })
    } catch {}
    setResendStatus('sent')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <div className="max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        )}
        {status === 'success' && (
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
            ✓
          </div>
        )}
        {status === 'error' && (
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">
            ✕
          </div>
        )}

        <h2 className="text-2xl font-bold">
          {status === 'loading'
            ? t('auth.verifying')
            : status === 'success'
            ? t('auth.emailVerified')
            : t('auth.verificationFailed')}
        </h2>

        {status !== 'loading' && (
          <p className="text-muted-foreground">{message}</p>
        )}

        {status === 'success' && (
          <Link
            to="/login"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t('auth.goToLogin')}
          </Link>
        )}

        {status === 'error' && (
          <div className="text-left rounded-xl border bg-white p-6 shadow-sm space-y-4 mt-6">
            <h3 className="text-sm font-semibold text-center">
              {t('auth.needNewLink')}
            </h3>
            <p className="text-xs text-muted-foreground text-center">
              {t('auth.enterEmailBelow')}{' '}
              <Link to="/register" className="text-primary hover:underline">
                {t('auth.registrationPage')}
              </Link>{' '}
              {t('auth.signUpAgainSameEmail')}
            </p>
            {resendStatus === 'sent' ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 text-center">
                {t('auth.linkSentIfExists')}
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@company.mr"
                  className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={resendStatus === 'sending'}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {resendStatus === 'sending'
                    ? t('auth.sending')
                    : t('auth.resendVerification')}
                </button>
              </form>
            )}
            <Link
              to="/login"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}