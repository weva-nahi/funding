import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import api from '@/lib/axios'
import { richatLogo } from '@/lib/sourceLogos'

export function RegisterPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== passwordConfirm) {
      setError(t('auth.passwordsNoMatch'))
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register/', {
        email,
        password,
        password_confirm: passwordConfirm,
        company_name: companyName || undefined,
      })
      navigate('/verify-email-sent', { state: { email } })
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } }
      setError(ax.response?.data?.error?.message || t('errors.submitFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <img src={richatLogo} alt="Richat Partners" className="h-16 w-16 rounded-2xl object-cover bg-white/20 backdrop-blur mb-8" />
          <h1 className="text-4xl font-bold mb-4">{t('auth.joinRichat')}</h1>
          <p className="text-teal-200 text-lg leading-relaxed">
            {t('auth.joinRichatDesc')}
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
            <h2 className="text-3xl font-bold tracking-tight">{t('auth.createAccountTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('auth.createAccountSubtitle')}</p>
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('auth.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@company.mr" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('auth.companyName')}</label>
              <input type="text" value={companyName}
                onChange={e => setCompanyName(e.target.value.slice(0, 60))}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('auth.companyNamePlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={8}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pe-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('auth.passwordConfirm')}</label>
              <div className="relative">
                <input type={showPasswordConfirm ? 'text' : 'password'} value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)} required
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pe-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPasswordConfirm(v => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.alreadyAccount')}{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}