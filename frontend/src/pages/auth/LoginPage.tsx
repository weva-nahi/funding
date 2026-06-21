import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api, { setAccessToken } from '@/lib/axios'
import { useAuthStore, useNotificationStore } from '@/store'
import { useQueryClient } from '@tanstack/react-query'

const DEMO_ACCOUNTS = [
  {
    label: 'Admin Demo',
    email: 'admin@richat.mr',
    password: 'Admin1234!',
    role: 'admin',
    color: 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200',
    badge: 'bg-purple-600 text-white',
  },
  {
    label: 'Client Demo',
    email: 'client@richat.mr',
    password: 'Client1234!',
    role: 'client',
    color: 'bg-teal-100 border-teal-300 text-teal-800 hover:bg-teal-200',
    badge: 'bg-teal-600 text-white',
  },
]

export function LoginPage() {
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

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname

  const fillDemo = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
    setShowResendLink(false)
  }

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
      } catch {
        // Non-critical
      }

      const targetRole = data.user.role

      if (from && from !== '/login') {
        const isAdminPath = from.startsWith('/admin')
        if (targetRole === 'admin' && isAdminPath) {
          navigate(from, { replace: true })
          return
        }
        if (targetRole === 'client' && !isAdminPath) {
          navigate(from, { replace: true })
          return
        }
      }

      navigate(
        targetRole === 'admin' ? '/admin' : '/dashboard',
        { replace: true }
      )
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { error?: { message?: string } } }
      }
      const msg = ax.response?.data?.error?.message || 'Login failed. Please check your credentials.'
      setError(msg)
      // Surface the resend-verification shortcut specifically when the
      // backend's "not verified" message comes through, so users aren't
      // stuck having to navigate to a separate page to find it.
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
    } catch {
      // Endpoint is intentionally always success-shaped
    } finally {
      setResendStatus('sent')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-teal-700 to-slate-900 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold mb-8">
            R
          </div>
          <h1 className="text-4xl font-bold mb-4">Welcome back to Richat</h1>
          <p className="text-teal-100 text-lg">
            Access international climate finance opportunities for your
            Mauritanian business.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Sign in</h2>
            <p className="mt-2 text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          {/* ── Demo Accounts (development only) ── */}
          {import.meta.env.DEV && (
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  Development — Quick Login
                </p>
              </div>
              <p className="text-xs text-amber-600">
                Click a demo account to fill in credentials, then click Sign in.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => fillDemo(account)}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${account.color}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{account.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${account.badge}`}>
                        {account.role}
                      </span>
                    </div>
                    <p className="text-xs opacity-70 truncate">{account.email}</p>
                    <p className="text-xs opacity-70">{account.password}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 space-y-2">
              <p>{error}</p>
              {showResendLink && (
                <div className="pt-2 border-t border-red-200">
                  {resendStatus === 'sent' ? (
                    <p className="text-xs text-red-600">
                      If an unverified account exists for this email, a new verification link has been sent.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendStatus === 'sending'}
                      className="text-xs font-semibold text-red-700 underline hover:text-red-800 disabled:opacity-50"
                    >
                      {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@company.mr"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}