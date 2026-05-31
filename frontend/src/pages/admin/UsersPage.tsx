import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { Search, UserCheck, UserX } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, page],
    queryFn: () => api.get('/authentication/users/', { params: { search: debouncedSearch || undefined, page } }).then(r => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users Management</h1>
        <p className="text-muted-foreground mt-1">Manage platform clients and administrators</p>
      </div>

      <div className="flex max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" /></td></tr>
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : (
                data?.results?.map((user: any) => (
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
                    <td className="px-6 py-4 text-muted-foreground">{new Date(user.date_joined).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                       <button className="text-sm font-medium text-primary hover:underline">Manage</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {data?.count > 0 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Previous</button>
          <button onClick={() => setPage(p => p + 1)} disabled={!data?.next} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  )
}
