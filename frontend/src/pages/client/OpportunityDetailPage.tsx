import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '@/lib/axios'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate, daysUntil } from '@/utils/formatDate'
import { Globe, Calendar, DollarSign, ArrowLeft, ExternalLink, FileText } from 'lucide-react'
import type { Opportunity } from '@/types'

export function OpportunityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: opp, isLoading, isError } = useQuery<Opportunity>({
    queryKey: ['opportunity', id],
    queryFn: () => api.get(`/opportunities/${id}/`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )

  if (isError || !opp) return (
    <div className="text-center py-20 text-red-600">Could not load this opportunity.</div>
  )

  const days = daysUntil(opp.deadline ?? null)

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 p-8 text-white">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium">{opp.source}</span>
            {opp.funding_type && <span className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium">{opp.funding_type}</span>}
            {opp.sector && <span className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium">{opp.sector}</span>}
          </div>
          <h1 className="text-2xl font-bold">{opp.title}</h1>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            {opp.amount != null && (
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><DollarSign className="h-4 w-4" />Amount</div>
                <p className="text-lg font-bold">{formatCurrency(opp.amount, opp.currency)}</p>
              </div>
            )}
            {opp.deadline && (
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Calendar className="h-4 w-4" />Deadline</div>
                <p className={`text-lg font-bold ${days != null && days <= 7 ? 'text-red-600' : ''}`}>{formatDate(opp.deadline)}</p>
                {days != null && <p className="text-xs text-muted-foreground">{days <= 0 ? 'Expired' : `${days} days remaining`}</p>}
              </div>
            )}
            {opp.country && (
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Globe className="h-4 w-4" />Country</div>
                <p className="text-lg font-bold">{opp.country}</p>
              </div>
            )}
          </div>

          {opp.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{opp.description}</p>
            </div>
          )}

          {opp.eligibility_criteria && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Eligibility Criteria</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{opp.eligibility_criteria}</p>
            </div>
          )}

          {opp.required_documents && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Required Documents</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{opp.required_documents}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-2">Data Completeness</h3>
            <div className="h-2 rounded-full bg-muted overflow-hidden max-w-xs">
              <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                style={{ width: `${opp.completeness_score}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{opp.completeness_score}% complete</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {!opp.is_expired && (
              <Link to={`/opportunities/${id}/apply`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all">
                <FileText className="h-4 w-4" /> Apply Now
              </Link>
            )}
            {opp.url && (
              <a href={opp.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                <ExternalLink className="h-4 w-4" /> Original Source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}