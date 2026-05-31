import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate, daysUntil } from '@/utils/formatDate'
import { SOURCES, FUNDING_TYPES } from '@/lib/constants'
import { Search, Filter, Globe, Calendar, DollarSign } from 'lucide-react'

export function OpportunitiesPage() {
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [fundingType, setFundingType] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search)

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', debouncedSearch, source, fundingType, page],
    queryFn: () => api.get('/opportunities/', { params: { search: debouncedSearch || undefined, source: source || undefined, funding_type: fundingType || undefined, page } }).then(r => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Funding Opportunities</h1>
        <p className="text-muted-foreground mt-1">Browse and apply for international climate funding</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search opportunities..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1) }}
          className="rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={fundingType} onChange={e => { setFundingType(e.target.value); setPage(1) }}
          className="rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
          <option value="">All Types</option>
          {FUNDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{data?.count || 0} opportunities found</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.results?.map((opp: any) => {
              const days = daysUntil(opp.deadline)
              return (
                <Link key={opp.id} to={`/opportunities/${opp.id}`}
                  className="group rounded-xl border bg-white p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{opp.source}</span>
                    {opp.funding_type && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{opp.funding_type}</span>}
                  </div>
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{opp.title}</h3>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {opp.amount && (
                      <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" />{formatCurrency(opp.amount, opp.currency)}</div>
                    )}
                    {opp.deadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className={days != null && days <= 7 ? 'text-red-600 font-medium' : ''}>{formatDate(opp.deadline)}{days != null && days > 0 ? ` (${days}d)` : days != null && days <= 0 ? ' (Expired)' : ''}</span>
                      </div>
                    )}
                    {opp.country && <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />{opp.country}</div>}
                  </div>
                  {/* Completeness bar */}
                  <div className="mt-4">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all" style={{ width: `${opp.completeness_score}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{opp.completeness_score}% complete</p>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Pagination */}
          {data?.count > 0 && (
            <div className="flex justify-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data?.previous}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted transition-colors">Previous</button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!data?.next}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted transition-colors">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
