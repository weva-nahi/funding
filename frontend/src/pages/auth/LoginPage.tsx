import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import api, { setAccessToken } from '@/lib/axios'
import { useAuthStore, useNotificationStore } from '@/store'
import { useQueryClient } from '@tanstack/react-query'
import { richatLogo } from '@/lib/sourceLogos'

export function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showResendLink, setShowResendLink] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const { setUnreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowResendLink(false)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login/', { email, password })
      queryClient.clear()
      setAccessToken(data.access)
      setUser(data.user)

      try {
        const countRes = await api.get('/notifications/unread-count/')
        setUnreadCount(countRes.data.unread_count ?? 0)
      } catch {}

      const targetRole = data.user.role
      if (from && from !== '/login') {
        const isAdminPath = from.startsWith('/admin')
        if (targetRole === 'admin' && isAdminPath) { navigate(from, { replace: true }); return }
        if (targetRole === 'client' && !isAdminPath) { navigate(from, { replace: true }); return }
      }
      navigate(targetRole === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } }
      const msg = ax.response?.data?.error?.message || t('errors.loadFailed')
      setError(msg)
      if (msg.toLowerCase().includes('verify your email') || msg.toLowerCase().includes('not verified')) {
        setShowResendLink(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setResendStatus('sending')
    try {
      await api.post('/auth/resend-verification/', { email })
    } catch {}
    setResendStatus('sent')
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-teal-700 to-slate-900 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <img src={richatLogo} alt="Richat Partners" className="h-16 w-16 rounded-2xl object-cover bg-white/20 backdrop-blur mb-8" />
          <h1 className="text-4xl font-bold mb-4">{t('auth.welcomeBack')}</h1>
          <p className="text-teal-100 text-lg leading-relaxed">
            {t('auth.welcomeBackDesc')}
          </p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center lg:items-start">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <img src={richatLogo} alt="Richat Partners" className="h-12 w-12 rounded-xl object-cover" />
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent">Richat</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">{t('auth.signInTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('auth.signInSubtitle')}</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 space-y-2">
              <p>{error}</p>
              {showResendLink && (
                <div className="pt-2 border-t border-red-200">
                  {resendStatus === 'sent' ? (
                    <p className="text-xs text-red-600">{t('auth.linkSentIfExists')}</p>
                  ) : (
                    <button type="button" onClick={handleResend} disabled={resendStatus === 'sending'}
                      className="text-xs font-semibold text-red-700 underline hover:text-red-800 disabled:opacity-50">
                      {resendStatus === 'sending' ? t('auth.sending') : t('auth.resendVerification')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('auth.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@company.mr" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">{t('auth.password')}</label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">{t('auth.forgotPassword')}</Link>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">{t('auth.register2')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}