import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/lib/axios'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate, daysUntil } from '@/utils/formatDate'
import { SOURCES, FUNDING_TYPES, MAURITANIA_CITIES, SECTORS, AMOUNT_STEP } from '@/lib/constants'
import { Search, Globe, Calendar, DollarSign, Bookmark, BookmarkCheck, Filter, X, MapPin } from 'lucide-react'
import type { Opportunity, Paginated } from '@/types'

export function OpportunitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const savedTab = searchParams.get('saved') === 'true'

  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [fundingType, setFundingType] = useState('')
  const [city, setCity] = useState('')
  const [sector, setSector] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [hasDeadline, setHasDeadline] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search)
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<Paginated<Opportunity>>({
    queryKey: savedTab
      ? ['opportunities-saved', page]
      : ['opportunities', debouncedSearch, source, fundingType, city, sector, amountMin, amountMax, hasDeadline, page],
    queryFn: () => {
      if (savedTab) {
        return api.get('/opportunities/saved/', { params: { page } }).then(r => r.data)
      }
      return api.get('/opportunities/', {
        params: {
          search: debouncedSearch || undefined,
          source: source || undefined,
          funding_type: fundingType || undefined,
          city: city || undefined,
          sector: sector || undefined,
          amount_min: amountMin || undefined,
          amount_max: amountMax || undefined,
          has_deadline: hasDeadline ? 'true' : undefined,
          page,
        }
      }).then(r => r.data)
    },
  })

  const saveMutation = useMutation({
    mutationFn: ({ id, saving }: { id: number; saving: boolean }) =>
      saving
        ? api.post(`/opportunities/${id}/save/`)
        : api.delete(`/opportunities/${id}/save/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities-saved'] })
      queryClient.invalidateQueries({ queryKey: ['latest-opportunities'] })
    },
  })

  const toggleSaved = (opp: Opportunity, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    saveMutation.mutate({ id: opp.id, saving: !opp.is_saved })
  }

  const resetFilters = () => {
    setSearch(''); setSource(''); setFundingType(''); setCity('')
    setSector(''); setAmountMin(''); setAmountMax(''); setHasDeadline(false)
    setPage(1)
  }

  const hasActiveFilters = search || source || fundingType || city || sector || amountMin || amountMax || hasDeadline

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funding Opportunities</h1>
          <p className="text-muted-foreground mt-1">Browse and apply for climate funding in Mauritania</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSearchParams(savedTab ? {} : { saved: 'true' }); setPage(1) }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              savedTab ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            {savedTab ? 'Browsing Saved' : 'Saved'}
          </button>
        </div>
      </div>

      {!savedTab && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search opportunities..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full rounded-lg border ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
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
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                showFilters || hasActiveFilters ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters{hasActiveFilters ? ' •' : ''}
            </button>
          </div>

          {showFilters && (
            <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> City / Region
                  </label>
                  <select value={city} onChange={e => { setCity(e.target.value); setPage(1) }}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                    <option value="">All Mauritania</option>
                    {MAURITANIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sector</label>
                  <select value={sector} onChange={e => { setSector(e.target.value); setPage(1) }}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                    <option value="">All Sectors</option>
                    {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Min Amount (USD)</label>
                  <input type="number" step={AMOUNT_STEP} placeholder="0" value={amountMin}
                    onChange={e => { setAmountMin(e.target.value); setPage(1) }}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Max Amount (USD)</label>
                  <input type="number" step={AMOUNT_STEP} placeholder="∞" value={amountMax}
                    onChange={e => { setAmountMax(e.target.value); setPage(1) }}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={hasDeadline} onChange={e => { setHasDeadline(e.target.checked); setPage(1) }}
                    className="rounded border-gray-300 text-primary" />
                  Only show opportunities with a deadline
                </label>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" /> Reset filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-red-600">Failed to load opportunities. Please try again.</div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {savedTab ? `${data?.count ?? 0} saved opportunities` : `${data?.count ?? 0} opportunities found`}
          </p>
          {(data?.results?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bookmark className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p>{savedTab ? 'No saved opportunities yet.' : 'No opportunities found matching your filters.'}</p>
              {savedTab && (
                <button onClick={() => { setSearchParams({}); setPage(1) }}
                  className="mt-3 text-primary hover:underline text-sm">
                  Browse all opportunities
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data?.results?.map((opp) => {
                const days = daysUntil(opp.deadline ?? null)
                return (
                  <Link key={opp.id} to={`/opportunities/${opp.id}`}
                    className="group relative rounded-xl border bg-white p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all">
                    <button
                      onClick={(e) => toggleSaved(opp, e)}
                      disabled={saveMutation.isPending}
                      className="absolute top-4 end-4 p-1.5 rounded-full hover:bg-muted transition-colors"
                      title={opp.is_saved ? 'Remove from saved' : 'Save for later'}
                    >
                      {opp.is_saved
                        ? <BookmarkCheck className="h-4 w-4 text-primary" />
                        : <Bookmark className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      }
                    </button>

                    <div className="flex items-center gap-2 mb-3 pe-8">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{opp.source}</span>
                      {opp.funding_type && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{opp.funding_type}</span>
                      )}
                    </div>
                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{opp.title}</h3>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {opp.amount != null && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="ltr-numeric">{formatCurrency(opp.amount, opp.currency)}</span>
                        </div>
                      )}
                      {opp.deadline && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className={days != null && days <= 7 ? 'text-red-600 font-medium' : ''}>
                            {formatDate(opp.deadline)}{days != null && days > 0 ? ` (${days}d)` : days != null && days <= 0 ? ' (Expired)' : ''}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        {opp.city ? `${opp.city}, Mauritania` : 'Mauritania'}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {(data?.count ?? 0) > 0 && (
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