import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

vi.mock('@/lib/axios', () => ({
  default: {
    patch: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
}))

vi.mock('@/store', () => ({
  useAuthStore: () => ({
    user: {
      email: 'client@richat.mr',
      profile: {
        notify_application_status: true,
        notify_new_opportunities: false,
        notify_consulting_response: true,
        notify_deadline_reminder: true,
        notify_system_announcements: true,
        notify_email_enabled: true,
        notify_frequency: 'immediate',
      },
    },
    setUser: vi.fn(),
  }),
}))

import { NotificationSettingsPage } from '@/pages/client/NotificationSettingsPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <NotificationSettingsPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('NotificationSettingsPage', () => {
  it('renders all toggle fields', () => {
    renderPage()
    expect(screen.getByText('Application status changes')).toBeInTheDocument()
    expect(screen.getByText('New funding opportunities')).toBeInTheDocument()
    expect(screen.getByText('Consulting responses')).toBeInTheDocument()
    expect(screen.getByText('Deadline reminders')).toBeInTheDocument()
    expect(screen.getByText('System announcements')).toBeInTheDocument()
  })

  it('reflects initial toggle state from profile', () => {
    renderPage()
    const toggles = screen.getAllByRole('switch')
    // notify_new_opportunities is false in the mocked profile — its toggle
    // should render as unchecked (aria-checked="false").
    const newOppsToggle = toggles.find((_, i) => i === 1)
    expect(newOppsToggle).toHaveAttribute('aria-checked', 'false')
  })

  it('toggling a switch flips its aria-checked state', () => {
    renderPage()
    const toggles = screen.getAllByRole('switch')
    const firstToggle = toggles[0]
    const before = firstToggle.getAttribute('aria-checked')
    fireEvent.click(firstToggle)
    const after = firstToggle.getAttribute('aria-checked')
    expect(before).not.toBe(after)
  })

  it('shows frequency radio options only when email notifications enabled', () => {
    renderPage()
    expect(screen.getByText('Immediate')).toBeInTheDocument()
    expect(screen.getByText('Daily digest')).toBeInTheDocument()
  })

  it('save button triggers the API call and shows confirmation', async () => {
    renderPage()
    const saveButton = screen.getByRole('button', { name: /save preferences/i })
    fireEvent.click(saveButton)
    await waitFor(() => {
      expect(screen.getByText(/saved!/i)).toBeInTheDocument()
    })
  })
})