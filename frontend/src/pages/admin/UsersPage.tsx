import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { Search, UserCheck, UserX, Trash2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/utils/formatDate'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { User, Paginated } from '@/types'

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search)
  const queryClient = useQueryClient()

  const [confirmToggle, setConfirmToggle] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)

  const { data, isLoading, isError } = useQuery<Paginated<User>>({
    queryKey: ['admin-users', debouncedSearch, page],
    queryFn: () => api.get('/auth/users/', { params: { search: debouncedSearch || undefined, page } }).then(r => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/auth/users/${id}/`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmToggle(null)
    },
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/users/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmDelete(null)
    },
  })

  const users = data?.results ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users Management</h1>
        <p className="text-muted-foreground mt-1">Manage platform clients and administrators</p>
      </div>

      <div className="flex max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-red-600">Failed to load users. Please retry.</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium">{user.email}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{user.role}</span></td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="flex items-center gap-1.5 text-emerald-600"><UserCheck className="h-4 w-4" /> Active</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-600"><UserX className="h-4 w-4" /> Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setConfirmToggle(user)}
                          disabled={toggleActive.isPending}
                          className="text-sm font-medium text-primary hover:underline disabled:opacity-50">
                          {user.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(user)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          title="Delete user"
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
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Previous</button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!data?.next} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.is_active ? 'Disable this user?' : 'Enable this user?'}
        message={
          confirmToggle?.is_active
            ? `${confirmToggle?.email} will immediately lose access to the platform. They will not be able to log in until re-enabled. This does not delete their data.`
            : `${confirmToggle?.email} will regain access to the platform and be able to log in again.`
        }
        variant={confirmToggle?.is_active ? 'warning' : 'default'}
        confirmLabel={confirmToggle?.is_active ? 'Disable User' : 'Enable User'}
        isLoading={toggleActive.isPending}
        onConfirm={() => confirmToggle && toggleActive.mutate({ id: confirmToggle.id, is_active: !confirmToggle.is_active })}
        onCancel={() => setConfirmToggle(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Permanently delete this user?"
        message={`This will permanently delete ${confirmDelete?.email} and all associated data (applications, documents, notifications). This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete Permanently"
        requireTypedConfirmation={confirmDelete?.email}
        isLoading={deleteUser.isPending}
        onConfirm={() => confirmDelete && deleteUser.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}