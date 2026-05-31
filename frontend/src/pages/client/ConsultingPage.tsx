import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'
import { MessageSquare, Send, CheckCircle, Clock, XCircle } from 'lucide-react'

export function ConsultingPage() {
  const queryClient = useQueryClient()
  const [desc, setDesc] = useState('')
  const [priority, setPriority] = useState('medium')
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['my-consulting'],
    queryFn: () => api.get('/consulting/').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/consulting/', { description: desc, priority }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-consulting'] }); setShowForm(false); setDesc('') },
  })

  const statusIcon = (s: string) => {
    if (s === 'resolved') return <CheckCircle className="h-4 w-4 text-emerald-600" />
    if (s === 'rejected') return <XCircle className="h-4 w-4 text-red-600" />
    return <Clock className="h-4 w-4 text-amber-600" />
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consulting</h1>
          <p className="text-muted-foreground mt-1">Get expert advice from Richat Partners</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
          New Request
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Submit a Consulting Request</h3>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Describe what you need help with..."
            className="w-full rounded-lg border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          <div className="flex items-center gap-3">
            <select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <button disabled={desc.length < 10 || create.isPending} onClick={() => create.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" /> {create.isPending ? 'Sending...' : 'Submit'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (data?.length || 0) === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="mx-auto h-12 w-12 mb-3 opacity-30" />
          <p>No consulting requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.map((req: any) => (
            <div key={req.id} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(req.status)}
                  <span className="font-medium">Request #{req.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    req.priority === 'high' ? 'bg-red-100 text-red-700' : req.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                  }`}>{req.priority}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{req.description}</p>
              {req.admin_response && (
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">Richat Response:</p>
                  <p className="text-sm text-blue-700">{req.admin_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
