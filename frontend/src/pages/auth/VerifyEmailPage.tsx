import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '@/lib/axios'

export function VerifyEmailPage() {
  const { token } = useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <div className="max-w-md text-center space-y-4">
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
        {status !== 'loading' && (
          <Link to="/login" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
            Go to Login
          </Link>
        )}
      </div>
    </div>
  )
}