/**
 * WebSocket manager with auto-reconnect and exponential backoff.
 *
 * In development: Vite proxies /ws/ → ws://backend:8000/ws/
 * In production:  nginx proxies /ws/ → ws://backend:8000/ws/
 *
 * We build the WebSocket URL from window.location so it works in both
 * environments without hardcoded hostnames.
 *
 * Usage:
 *   notificationWS.connect()          // call after login
 *   notificationWS.disconnect()       // call on logout
 *   const unsub = notificationWS.subscribe(handler)
 *   unsub()                           // remove the handler
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
  /**
   * Set to false before deliberately closing the socket so the onclose
   * handler does NOT trigger a reconnect attempt.
   */
  private shouldReconnect = true

  constructor(path: string) {
    // path should start with /ws/
    this.path = path
  }

  private buildUrl(): string {
    const token = getAccessToken()
    // Build WS URL from current window location so proxy works correctly
    // in both dev (Vite proxy) and prod (nginx proxy)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host // e.g. localhost:5173 in dev
    return `${protocol}//${host}${this.path}${token ? `?token=${token}` : ''}`
  }

  connect(): void {
    const token = getAccessToken()
    if (!token) return // No point connecting without an access token

    // Don't open a second connection if one is already open or opening
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

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
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      30_000
    )
    this.reconnectAttempts++
    console.debug(
      `[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    )
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  disconnect(): void {
    // Must set shouldReconnect=false BEFORE calling close() so onclose
    // does not schedule a reconnect.
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