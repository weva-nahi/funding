/**
 * Axios instance — THE ONLY FILE that knows about JWT tokens.
 * All token logic lives here: storage, attachment, silent refresh, redirect.
 *
 * IMPORTANT: baseURL is intentionally relative ('/api/v1') so all requests
 * go through the Vite dev-server proxy (see vite.config.ts), which forwards
 * to the locally running backend at http://localhost:8000.
 */
import axios from 'axios'

// Requests go through the Vite dev-server proxy → localhost:8000
const API_BASE = '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send httpOnly cookies on every request
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ─── In-memory access token (never localStorage) ──────────────────────────────
let accessToken: string | null = null

export const setAccessToken = (token: string | null): void => {
  accessToken = token
}

export const getAccessToken = (): string | null => accessToken

// ─── Request interceptor: attach Authorization header ─────────────────────────
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ─── Response interceptor: silent 401 → refresh → retry ──────────────────────
type QueueEntry = {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}

let isRefreshing = false
let failedQueue: QueueEntry[] = []

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((entry) => {
    if (error) entry.reject(error)
    else entry.resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean
    }

    // CRITICAL: never intercept the refresh endpoint itself — that would
    // create an infinite retry loop on token expiry.
    if (originalRequest.url?.includes('/auth/token/refresh/')) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until the refresh in flight completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers!.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Use relative URL — goes through Vite proxy in dev, nginx in prod
        const { data } = await axios.post(
          '/api/v1/auth/token/refresh/',
          {},
          { withCredentials: true }
        )
        accessToken = data.access
        processQueue(null, data.access)
        originalRequest.headers!.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        accessToken = null
        // Only redirect if we are not already on an auth page
        const path = window.location.pathname
        if (!path.startsWith('/login') && !path.startsWith('/register')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api