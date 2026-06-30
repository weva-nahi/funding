import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Save, CheckCircle, Camera, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { useAuthStore } from '@/store'
import { extractError } from '@/utils/extractError'
import { SECTORS } from '@/lib/constants'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    company: '',
    sector: '',
    sector_other: '',
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
      const sector = user.profile.sector || ''
      const isKnown = SECTORS.some(s => s.value === sector)
      setForm(f => ({
        ...f,
        first_name: user.profile?.first_name || '',
        last_name: user.profile?.last_name || '',
        company: user.profile?.company || '',
        sector: isKnown ? sector : (sector ? 'other' : ''),
        sector_other: isKnown ? '' : sector,
      }))
    }
  }, [user])

  const effectiveSector = form.sector === 'other' ? form.sector_other : form.sector

  const saveAll = useMutation({
    mutationFn: async () => {
      const profileRes = await api.patch('/auth/profile/', {
        first_name: form.first_name,
        last_name: form.last_name,
        company: form.company,
        sector: effectiveSector,
      })
      if (form.old_password && form.new_password) {
        if (form.new_password !== form.confirm_password) throw new Error(t('auth.passwordsNoMatch'))
        if (form.new_password.length < 8) throw new Error(t('auth.passwordMinLength'))
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
      setError(err instanceof Error ? err.message : extractError(err, t('errors.submitFailed')))
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

  const avatarLetter = (form.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const avatarUrl = user?.profile?.avatar
  const displayName = form.first_name && form.last_name ? `${form.first_name} ${form.last_name}` : user?.email

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('profile.subtitle')}</p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 px-8 py-12 flex flex-col items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar"
                className="h-48 w-48 rounded-full object-cover border-4 border-white/30 shadow-2xl" />
            ) : (
              <div className="h-48 w-48 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-7xl font-bold text-white shadow-2xl border-4 border-white/30">
                {avatarLetter}
              </div>
            )}
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute bottom-2 right-2 h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
              title={t('profile.changeAvatar')}
            >
              <Camera className="h-5 w-5 text-teal-700" />
            </button>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) uploadAvatar.mutate(file) }} />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-2xl">{displayName}</p>
            <p className="text-teal-100 text-sm mt-1">{user?.email}</p>
            <span className="mt-3 inline-block text-xs rounded-full bg-white/20 px-4 py-1.5 text-white font-medium">
              {user?.role === 'admin' ? t('profile.administrator') : t('profile.client')}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('profile.firstName')}</label>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('profile.firstName')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('profile.lastName')}</label>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('profile.lastName')} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('profile.company')}</label>
            <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} maxLength={60}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('profile.company')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('profile.sector')}</label>
            <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value, sector_other: '' })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
              <option value="">{t('profile.selectSector')}</option>
              {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              <option value="other">{t('profile.other')}</option>
            </select>
            {form.sector === 'other' && (
              <input value={form.sector_other} onChange={e => setForm({ ...form, sector_other: e.target.value })}
                placeholder={t('profile.specifySector')}
                className="mt-2 w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-semibold mb-4">{t('profile.changePassword')}</p>
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-medium mb-1.5">{t('profile.currentPasswordLabel')}</label>
                <input type={showOld ? 'text' : 'password'} value={form.old_password}
                  onChange={e => setForm({ ...form, old_password: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('profile.leaveBlank')} />
                <button type="button" onClick={() => setShowOld(v => !v)}
                  className="absolute right-3 top-9 text-muted-foreground hover:text-foreground">
                  {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-sm font-medium mb-1.5">{t('profile.newPasswordLabel')}</label>
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
                  <label className="block text-sm font-medium mb-1.5">{t('profile.confirm')}</label>
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
              {saveAll.isPending ? t('profile.saving') : t('profile.saveChanges')}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" /> {t('profile.saved')}
              </span>
            )}
          </div>

          <div className="pt-2 border-t">
            <Link to="/profile/notifications"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Bell className="h-4 w-4" /> {t('profile.notificationSettings')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}