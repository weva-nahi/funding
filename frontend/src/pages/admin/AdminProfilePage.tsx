import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Save, CheckCircle, Camera } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/store'
import { extractError } from '@/utils/extractError'

export function AdminProfilePage() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const avatarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.profile) {
      setForm(f => ({
        ...f,
        first_name: user.profile?.first_name || '',
        last_name: user.profile?.last_name || '',
      }))
    }
  }, [user])

  const saveAll = useMutation({
    mutationFn: async () => {
      const profileRes = await api.patch('/auth/profile/', {
        first_name: form.first_name,
        last_name: form.last_name,
      })
      if (form.old_password && form.new_password) {
        if (form.new_password !== form.confirm_password) throw new Error('New passwords do not match.')
        if (form.new_password.length < 8) throw new Error('New password must be at least 8 characters.')
        await api.post('/auth/change-password/', {
          old_password: form.old_password,
          new_password: form.new_password,
        })
      }
      return profileRes
    },
    onSuccess: (res) => {
      if (user) setUser({ ...user, profile: { ...user.profile, ...res.data } })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setForm(f => ({ ...f, old_password: '', new_password: '', confirm_password: '' }))
      setError('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : extractError(err, 'Failed to save.'))
    },
  })

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return api.patch('/auth/profile/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: (res) => {
      if (user) setUser({ ...user, profile: { ...user.profile, ...res.data } })
    },
  })

  const avatarLetter = (form.first_name?.[0] || user?.email?.[0] || 'A').toUpperCase()
  const avatarUrl = user?.profile?.avatar
  const displayName = form.first_name && form.last_name ? `${form.first_name} ${form.last_name}` : user?.email

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and password</p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {/* Large avatar section */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-12 flex flex-col items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar"
                className="h-48 w-48 rounded-full object-cover border-4 border-white/20 shadow-2xl" />
            ) : (
              <div className="h-48 w-48 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-7xl font-bold text-white shadow-2xl border-4 border-white/20">
                {avatarLetter}
              </div>
            )}
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute bottom-2 right-2 h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
              title="Change photo"
            >
              <Camera className="h-5 w-5 text-slate-700" />
            </button>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) uploadAvatar.mutate(file) }} />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-2xl">{displayName}</p>
            <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
            <span className="mt-3 inline-block text-xs rounded-full bg-teal-500/20 px-4 py-1.5 text-teal-300 font-medium">
              Administrator
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="p-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">First Name</label>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="First name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Last Name</label>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Last name" />
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-semibold mb-4">Change Password</p>
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-medium mb-1.5">Current Password</label>
                <input type={showOld ? 'text' : 'password'} value={form.old_password}
                  onChange={e => setForm({ ...form, old_password: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Leave blank to keep current" />
                <button type="button" onClick={() => setShowOld(v => !v)}
                  className="absolute right-3 top-9 text-muted-foreground hover:text-foreground">
                  {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-sm font-medium mb-1.5">New Password</label>
                  <input type={showNew ? 'text' : 'password'} value={form.new_password}
                    onChange={e => setForm({ ...form, new_password: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium mb-1.5">Confirm</label>
                  <input type={showConfirm ? 'text' : 'password'} value={form.confirm_password}
                    onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saveAll.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}