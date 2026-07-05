/**
 * WebSocket manager with auto-reconnect and exponential backoff.
 *
 * Vite proxies /ws/ → ws://localhost:8000/ws/ (see vite.config.ts).
 */
import { getAccessToken } from './axios'

type MessageHandler = (data: unknown) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private readonly path: string
  private handlers: Set<MessageHandler> = new Set()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true

  constructor(path: string) {
    this.path = path
  }

  private buildUrl(): string {
    const token = getAccessToken()
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}${this.path}${token ? `?token=${token}` : ''}`
  }

  isConnected(): boolean {
    return (
      this.ws !== null &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    )
  }

  connect(): void {
    const token = getAccessToken()
    if (!token) return
    if (this.isConnected()) return

    this.shouldReconnect = true
    const url = this.buildUrl()
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      console.debug(`[WS] Connected: ${this.path}`)
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handlers.forEach((handler) => handler(data))
      } catch {
        // Ignore malformed frames
      }
    }

    this.ws.onclose = (event) => {
      console.debug(`[WS] Closed: ${this.path} code=${event.code}`)
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.debug(`[WS] Error on ${this.path}`, error)
      this.ws?.close()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.debug(`[WS] Max reconnect attempts reached for ${this.path}`)
      return
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000)
    this.reconnectAttempts++
    console.debug(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect')
      this.ws = null
    }
  }
}

export const notificationWS = new WebSocketManager('/ws/notifications/')
export const scrapingWS = new WebSocketManager('/ws/scraping/')
export default WebSocketManager

/**
 * Cross-tab session sync — fixes "multiple tabs don't sync logout".
 *
 * BroadcastChannel lets any tab announce "I just logged out" and every
 * other open tab of the same origin receives it instantly and forces its
 * own logout, instead of staying silently authenticated until the user
 * manually refreshes or hits a 401 on their next action.
 *
 * Falls back to a no-op shape in environments without BroadcastChannel
 * support (very old browsers) — sessions in those tabs simply behave as
 * they did before this fix (no cross-tab sync), rather than throwing.
 */
const CHANNEL_NAME = 'richat-session-sync'

type SessionSyncMessage = { type: 'logout' } | { type: 'login' }

class SessionSyncManager {
  private channel: BroadcastChannel | null = null
  private handlers: Set<(msg: SessionSyncMessage) => void> = new Set()

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
        this.handlers.forEach((handler) => handler(event.data))
      }
    }
  }

  broadcastLogout(): void {
    this.channel?.postMessage({ type: 'logout' } satisfies SessionSyncMessage)
  }

  broadcastLogin(): void {
    this.channel?.postMessage({ type: 'login' } satisfies SessionSyncMessage)
  }

  subscribe(handler: (msg: SessionSyncMessage) => void): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }
}

export const sessionSync = new SessionSyncManager()