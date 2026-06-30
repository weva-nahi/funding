import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, RefreshCw } from 'lucide-react'
import api from '@/lib/axios'

export function CheckEmailPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const email = (location.state as { email?: string })?.email || ''
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (resendStatus !== 'sent') return
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval)
          setResendStatus('idle')
          return 60
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [resendStatus])

  const handleResend = async () => {
    if (!email || resendStatus !== 'idle') return
    setResendStatus('sending')
    try {
      await api.post('/auth/resend-verification/', { email })
    } catch {}
    setResendStatus('sent')
    setCountdown(60)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-teal-100 flex items-center justify-center">
          <Mail className="h-10 w-10 text-teal-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">{t('auth.checkYourEmail')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('auth.weSentLinkTo')}
          </p>
          {email && (
            <p className="font-semibold text-foreground mt-1">{email}</p>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4 text-left">
          <h2 className="font-semibold text-sm">{t('auth.whatToDoNext')}</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              {t('auth.step1')}
            </li>
            <li className="flex gap-3">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              {t('auth.step2')}
            </li>
            <li className="flex gap-3">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              {t('auth.step3')}
            </li>
          </ol>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('auth.didntReceive')}</p>
          <button
            onClick={handleResend}
            disabled={resendStatus !== 'idle'}
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${resendStatus === 'sending' ? 'animate-spin' : ''}`} />
            {resendStatus === 'idle' && t('auth.resendVerification')}
            {resendStatus === 'sending' && t('auth.sending')}
            {resendStatus === 'sent' && t('auth.resent', { seconds: countdown })}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('auth.linkExpiry')}{' '}
          <Link to="/register" className="text-primary hover:underline">{t('auth.registerAgain')}</Link>{' '}
          {t('auth.withCorrectEmail')}
        </p>

        <Link to="/login" className="block text-sm text-muted-foreground hover:text-foreground">
          ← {t('auth.backToLogin')}
        </Link>
      </div>
    </div>
  )
}