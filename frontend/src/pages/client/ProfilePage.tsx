import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Save, CheckCircle, Lock } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/store'

export function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ first_name: '', last_name: '', company: '', sector: '' })
  const [saved, setSaved] = useState(false)

  // Password change state
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    if (user?.profile) {
      setForm({
        first_name: user.profile.first_name || '',
        last_name: user.profile.last_name || '',
        company: user.profile.company || '',
        sector: user.profile.sector || '',
      })
    }
  }, [user])

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/auth/profile/', form),
    onSuccess: () => {
      if (user) {
        setUser({ ...user, profile: { ...user.profile, avatar: user.profile?.avatar ?? null, ...form } })
      }
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const changePassword = useMutation({
    mutationFn: () =>
      api.post('/auth/change-password/', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      }),
    onSuccess: () => {
      setPwForm({ old_password: '', new_password: '', confirm_password: '' })
      setPwError('')
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { error?: { message?: string } } } }
      setPwError(ax.response?.data?.error?.message || 'Failed to change password.')
    },
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('New passwords do not match.')
      return
    }
    if (pwForm.new_password.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    changePassword.mutate()
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information</p>
      </div>

      {/* Profile Info */}
      <div className="rounded-xl border bg-white p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-2xl font-bold text-white">
            {(form.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">
              {form.first_name && form.last_name ? `${form.first_name} ${form.last_name}` : user?.email}
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">First Name</label>
            <input
              value={form.first_name}
              onChange={e => setForm({ ...form, first_name: e.target.value })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Last Name</label>
            <input
              value={form.last_name}
              onChange={e => setForm({ ...form, last_name: e.target.value })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Company</label>
            <input
              value={form.company}
              onChange={e => setForm({ ...form, company: e.target.value })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sector</label>
            <input
              value={form.sector}
              onChange={e => setForm({ ...form, sector: e.target.value })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" /> Saved!
            </span>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border bg-white p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Lock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold">Change Password</h2>
            <p className="text-xs text-muted-foreground">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {pwError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {pwError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={pwForm.old_password}
                onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })}
                required
                className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowOld(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showOld ? 'Hide current password' : 'Show current password'}
              >
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                required
                minLength={8}
                className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={pwForm.confirm_password}
                onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                required
                className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
            {pwForm.confirm_password && pwForm.new_password === pwForm.confirm_password && pwForm.new_password.length >= 8 && (
              <p className="text-xs text-emerald-600 mt-1">Passwords match.</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {changePassword.isPending ? 'Updating...' : 'Update Password'}
            </button>
            {pwSaved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" /> Password updated!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}