import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/lib/axios'

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500', 'bg-emerald-500']

function getStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (pw.length >= 12) score++
  return Math.min(score, 4)
}

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const strength = useMemo(() => getStrength(password), [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== passwordConfirm) { setError('Passwords do not match.'); return }
    setError(''); setLoading(true)
    try {
      await api.post('/auth/register/', { email, password, password_confirm: passwordConfirm })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed.')
    } finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✓</div>
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="text-muted-foreground">We've sent a verification link to <strong>{email}</strong>. Please verify your email to activate your account.</p>
          <Link to="/login" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold mb-8">R</div>
          <h1 className="text-4xl font-bold mb-4">Join Richat</h1>
          <p className="text-teal-200 text-lg">Start accessing billions in climate finance opportunities today.</p>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Create account</h2>
            <p className="mt-2 text-muted-foreground">Register your business to get started</p>
          </div>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0,1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColors[strength] : 'bg-gray-200'}`} />)}
                  </div>
                  <p className={`text-xs mt-1 ${strength >= 3 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{strengthLabels[strength]}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
