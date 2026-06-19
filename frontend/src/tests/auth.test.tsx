import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { LoginPage } from '@/pages/auth/LoginPage'

// Mock axios so we don't make real HTTP calls
vi.mock('@/lib/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
}))

vi.mock('@/store', () => ({
  useAuthStore: () => ({ setUser: vi.fn(), user: null }),
  useNotificationStore: () => ({ setUnreadCount: vi.fn() }),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate, useLocation: () => ({ state: null, pathname: '/login' }) }
})

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => { mockNavigate.mockClear() })

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/you@company/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error on failed login', async () => {
    const api = (await import('@/lib/axios')).default
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid email or password.' } } }
    })

    renderLogin()
    fireEvent.change(screen.getByPlaceholderText(/you@company/i), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument()
    })
  })
})