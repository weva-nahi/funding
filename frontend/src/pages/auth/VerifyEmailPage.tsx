import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '@/lib/axios'

export function VerifyEmailPage() {
  const { token } = useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }
    api.get(`/auth/verify-email/${token}/`)
      .then(() => {
        setStatus('success')
        setMessage('Your email has been verified. You can now sign in.')
      })
      .catch((err: unknown) => {
        const ax = err as { response?: { data?: { error?: { message?: string } } } }
        setStatus('error')
        setMessage(ax.response?.data?.error?.message || 'Verification failed or the link has expired.')
      })
  }, [token])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail) return
    setResendStatus('sending')
    try {
      await api.post('/auth/resend-verification/', { email: resendEmail })
      setResendStatus('sent')
    } catch {
      // Endpoint always returns success-shaped responses to avoid leaking
      // account existence, but handle network failures gracefully too.
      setResendStatus('sent')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <div className="max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        )}
        {status === 'success' && (
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✓</div>
        )}
        {status === 'error' && (
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">✕</div>
        )}
        <h2 className="text-2xl font-bold">
          {status === 'loading' ? 'Verifying…' : status === 'success' ? 'Email verified' : 'Verification failed'}
        </h2>
        {status !== 'loading' && <p className="text-muted-foreground">{message}</p>}

        {status === 'success' && (
          <Link to="/login" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
            Go to Login
          </Link>
        )}

        {status === 'error' && (
          <div className="text-left rounded-xl border bg-white p-6 shadow-sm space-y-4 mt-6">
            <h3 className="text-sm font-semibold text-center">Need a new verification link?</h3>
            <p className="text-xs text-muted-foreground text-center">
              Verification links expire after 24 hours, or your previous link may have already been used.
              Enter your email below to receive a new one.
            </p>
            {resendStatus === 'sent' ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 text-center">
                If an unverified account exists for that email, a new link has been sent. Check your inbox.
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
                  {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
                </button>
              </form>
            )}
            <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}