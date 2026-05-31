import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useAuthStore } from '@/store'
import { User, Save, CheckCircle } from 'lucide-react'

export function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ first_name: '', last_name: '', company: '', sector: '' })
  const [saved, setSaved] = useState(false)

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
    onSuccess: (res) => {
      setUser({ ...user!, profile: { ...user!.profile!, ...form } })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information</p>
      </div>

      <div className="rounded-xl border bg-white p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-2xl font-bold text-white">
            {(form.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{form.first_name && form.last_name ? `${form.first_name} ${form.last_name}` : user?.email}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">First Name</label>
            <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Last Name</label>
            <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Company</label>
            <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sector</label>
            <input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><CheckCircle className="h-4 w-4" /> Saved!</span>}
        </div>
      </div>
    </div>
  )
}
