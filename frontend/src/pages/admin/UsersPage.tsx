import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { Search, UserCheck, UserX, Trash2, Lock } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/utils/formatDate'
import type { User, Paginated } from '@/types'

export function UsersPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search)
  const queryClient = useQueryClient()

  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletePasswordError, setDeletePasswordError] = useState('')

  const [confirmToggleUser, setConfirmToggleUser] = useState<{ user: User; enable: boolean } | null>(null)
  const [togglePassword, setTogglePassword] = useState('')
  const [togglePasswordError, setTogglePasswordError] = useState('')

  const { data, isLoading, isError } = useQuery<Paginated<User>>({
    queryKey: ['admin-users', debouncedSearch, page],
    queryFn: () =>
      api.get('/auth/users/', {
        params: { search: debouncedSearch || undefined, page },
      }).then((r) => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active, password }: { id: number; is_active: boolean; password: string }) => {
      const res = await api.post('/auth/verify-admin-password/', { password })
      if (!res.data.success) throw new Error('Incorrect password.')
      return api.patch(`/auth/users/${id}/`, { is_active })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmToggleUser(null)
      setTogglePassword('')
      setTogglePasswordError('')
    },
    onError: () => {
      setTogglePasswordError(t('admin.usersPage.incorrectPassword'))
    },
  })

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post('/auth/verify-admin-password/', { password: deletePassword })
      if (!res.data.success) throw new Error('Incorrect password.')
      return api.delete(`/auth/users/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmDeleteUser(null)
      setDeletePassword('')
      setDeletePasswordError('')
    },
    onError: () => {
      setDeletePasswordError(t('admin.usersPage.incorrectPassword'))
    },
  })

  const users = data?.results ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.usersPage.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('admin.usersPage.subtitle')}</p>
      </div>

      <div className="flex max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('admin.usersPage.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">{t('common.company')}</th>
                <th className="px-6 py-3 font-medium">{t('common.email')}</th>
                <th className="px-6 py-3 font-medium">{t('admin.usersPage.role')}</th>
                <th className="px-6 py-3 font-medium">{t('common.status')}</th>
                <th className="px-6 py-3 font-medium">{t('admin.usersPage.joined')}</th>
                <th className="px-6 py-3 font-medium text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                </td></tr>
              ) : isError ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-red-600">{t('errors.loadFailed')}</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">{t('admin.usersPage.noUsers')}</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium text-sm">
                      {user.profile?.company || <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role === 'admin' ? t('profile.administrator') : t('profile.client')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <UserCheck className="h-4 w-4" /> {t('admin.usersPage.active')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-600">
                          <UserX className="h-4 w-4" /> {t('admin.usersPage.disabled')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            setConfirmToggleUser({ user, enable: !user.is_active })
                            setTogglePassword('')
                            setTogglePasswordError('')
                          }}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {user.is_active ? t('admin.usersPage.disable') : t('admin.usersPage.enable')}
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDeleteUser(user)
                            setDeletePassword('')
                            setDeletePasswordError('')
                          }}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          title={t('admin.usersPage.deleteUser')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(data?.count ?? 0) > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data?.previous}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.previous')}</button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">{t('common.page')} {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={!data?.next}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t('common.next')}</button>
        </div>
      )}

      {/* Toggle active confirmation with password */}
      {confirmToggleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${confirmToggleUser.enable ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <Lock className={`h-5 w-5 ${confirmToggleUser.enable ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <h2 className="font-semibold">{confirmToggleUser.enable ? t('admin.usersPage.enableConfirmTitle') : t('admin.usersPage.disableConfirmTitle')}</h2>
                <p className="text-xs text-muted-foreground">
                  {confirmToggleUser.enable
                    ? t('admin.usersPage.enableConfirmDesc', { email: confirmToggleUser.user.email })
                    : t('admin.usersPage.disableConfirmDesc', { email: confirmToggleUser.user.email })}
                </p>
              </div>
            </div>
            {togglePasswordError && <p className="text-sm text-red-600">{togglePasswordError}</p>}
            <input
              type="password"
              value={togglePassword}
              onChange={(e) => setTogglePassword(e.target.value)}
              placeholder={t('admin.usersPage.adminPasswordPlaceholder')}
              autoFocus
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmToggleUser(null)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">{t('common.cancel')}</button>
              <button
                onClick={() => toggleActive.mutate({
                  id: confirmToggleUser.user.id,
                  is_active: confirmToggleUser.enable,
                  password: togglePassword,
                })}
                disabled={!togglePassword || toggleActive.isPending}
                className={`rounded-lg px-6 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmToggleUser.enable ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {toggleActive.isPending ? t('common.processing') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete user confirmation with password */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold">{t('admin.usersPage.deleteConfirmTitle')}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('admin.usersPage.deleteConfirmDesc', { email: confirmDeleteUser.email })}
                </p>
              </div>
            </div>
            {deletePasswordError && <p className="text-sm text-red-600">{deletePasswordError}</p>}
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t('admin.usersPage.adminPasswordPlaceholder')}
              autoFocus
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteUser(null)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">{t('common.cancel')}</button>
              <button
                onClick={() => deleteUser.mutate(confirmDeleteUser.id)}
                disabled={!deletePassword || deleteUser.isPending}
                className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteUser.isPending ? t('admin.usersPage.deleting') : t('admin.usersPage.deletePermanently')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}