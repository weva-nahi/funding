import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import api from '@/lib/axios'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordsNoMatch'))
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/password-reset/confirm/', {
        token,
        new_password: password,
      })
      navigate('/login')
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t('auth.setNewPassword')}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t('auth.setNewPasswordDesc')}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t('auth.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t('auth.confirmNewPassword')}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? (
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
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? t('auth.resetting') : t('auth.resetPasswordBtn')}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}