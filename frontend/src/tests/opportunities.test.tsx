import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        count: 2,
        next: null,
        previous: null,
        results: [
          { id: 1, title: 'GCF Solar Initiative', source: 'GCF', completeness_score: 80, currency: 'USD', status: 'published', created_at: '2024-01-01T00:00:00Z', is_saved: false },
          { id: 2, title: 'World Bank Water Project', source: 'WORLD_BANK', completeness_score: 60, currency: 'USD', status: 'published', created_at: '2024-01-02T00:00:00Z', is_saved: false },
        ],
      }
    }),
    post: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
}))

vi.mock('@/store', () => ({
  useAuthStore: () => ({ user: { email: 'client@richat.mr', role: 'client' }, isAuthenticated: true }),
  useNotificationStore: () => ({ unreadCount: 0, setUnreadCount: vi.fn(), incrementUnread: vi.fn() }),
}))

import { OpportunitiesPage } from '@/pages/client/OpportunitiesPage'

function renderOpportunities() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('OpportunitiesPage', () => {
  it('renders the page title', async () => {
    renderOpportunities()
    expect(screen.getByText(/Funding Opportunities/i)).toBeInTheDocument()
  })

  it('renders opportunity cards from API', async () => {
    renderOpportunities()
    // Wait for async data
    const card = await screen.findByText('GCF Solar Initiative')
    expect(card).toBeInTheDocument()
    expect(screen.getByText('World Bank Water Project')).toBeInTheDocument()
  })
})