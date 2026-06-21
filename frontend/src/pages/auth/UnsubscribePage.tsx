import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '@/lib/axios'

export function UnsubscribePage() {
  const { token } = useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing unsubscribe link.')
      return
    }
    api.post('/auth/unsubscribe/', { token })
      .then((res) => {
        setStatus('success')
        setMessage(res.data.message || 'You have been unsubscribed from emails.')
      })
      .catch((err: unknown) => {
        const ax = err as { response?: { data?: { error?: { message?: string } } } }
        setStatus('error')
        setMessage(ax.response?.data?.error?.message || 'This unsubscribe link is invalid or has expired.')
      })
  }, [token])

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
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl">!</div>
        )}
        <h2 className="text-2xl font-bold">
          {status === 'loading' ? 'Processing…' : status === 'success' ? 'Unsubscribed' : 'Link invalid'}
        </h2>
        {status !== 'loading' && <p className="text-muted-foreground">{message}</p>}
        {status === 'success' && (
          <p className="text-xs text-muted-foreground">
            You'll still receive essential account emails (e.g. password resets), but won't receive
            application updates, new opportunity alerts, or other notification emails. You can re-enable
            these anytime from your notification settings.
          </p>
        )}
        <Link to="/login" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          Go to Login
        </Link>
      </div>
    </div>
  )
}