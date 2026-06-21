import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, CheckCircle, Bell, Mail } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/store'

interface NotificationPrefs {
  notify_application_status: boolean
  notify_new_opportunities: boolean
  notify_consulting_response: boolean
  notify_deadline_reminder: boolean
  notify_system_announcements: boolean
  notify_email_enabled: boolean
  notify_frequency: 'immediate' | 'daily'
}

const TOGGLE_FIELDS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  {
    key: 'notify_application_status',
    label: 'Application status changes',
    description: 'When an application you submitted is reviewed, approved, or rejected.',
  },
  {
    key: 'notify_new_opportunities',
    label: 'New funding opportunities',
    description: 'When a new opportunity matching your interests is published.',
  },
  {
    key: 'notify_consulting_response',
    label: 'Consulting responses',
    description: 'When the Richat team responds to a consulting request you submitted.',
  },
  {
    key: 'notify_deadline_reminder',
    label: 'Deadline reminders',
    description: 'Reminders 7 days and 1 day before an application deadline.',
  },
  {
    key: 'notify_system_announcements',
    label: 'System announcements',
    description: 'Important platform updates and announcements.',
  },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'
        }`}
      />
    </button>
  )
}

export function NotificationSettingsPage() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    notify_application_status: true,
    notify_new_opportunities: true,
    notify_consulting_response: true,
    notify_deadline_reminder: true,
    notify_system_announcements: true,
    notify_email_enabled: true,
    notify_frequency: 'immediate',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user?.profile) {
      const p = user.profile as unknown as NotificationPrefs
      setPrefs({
        notify_application_status: p.notify_application_status ?? true,
        notify_new_opportunities: p.notify_new_opportunities ?? true,
        notify_consulting_response: p.notify_consulting_response ?? true,
        notify_deadline_reminder: p.notify_deadline_reminder ?? true,
        notify_system_announcements: p.notify_system_announcements ?? true,
        notify_email_enabled: p.notify_email_enabled ?? true,
        notify_frequency: p.notify_frequency ?? 'immediate',
      })
    }
  }, [user])

  const save = useMutation({
    mutationFn: () => api.patch('/auth/profile/', prefs),
    onSuccess: (res) => {
      if (user) {
        setUser({ ...user, profile: { ...user.profile, ...res.data } })
      }
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const setToggle = (key: keyof NotificationPrefs) => (value: boolean) =>
    setPrefs((p) => ({ ...p, [key]: value }))

  const setFrequency = (freq: 'immediate' | 'daily') =>
    setPrefs((p) => ({ ...p, notify_frequency: freq }))

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <Link to="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Profile
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> Notification Settings
        </h1>
        <p className="text-muted-foreground mt-1">Choose what you want to be notified about, and how.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-1 divide-y">
        {TOGGLE_FIELDS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <Toggle checked={prefs[key] as boolean} onChange={setToggle(key)} />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Delivery</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Email notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Master switch — turn off to stop all notification emails.</p>
          </div>
          <Toggle checked={prefs.notify_email_enabled} onChange={setToggle('notify_email_enabled')} />
        </div>

        {prefs.notify_email_enabled && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Frequency</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  checked={prefs.notify_frequency === 'immediate'}
                  onChange={() => setFrequency('immediate')}
                />
                Immediate
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  checked={prefs.notify_frequency === 'daily'}
                  onChange={() => setFrequency('daily')}
                />
                Daily digest
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
          <Save className="h-4 w-4" />
          {save.isPending ? 'Saving...' : 'Save Preferences'}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" /> Saved!
          </span>
        )}
      </div>
    </div>
  )
}