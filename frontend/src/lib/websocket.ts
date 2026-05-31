/**
 * WebSocket manager with auto-reconnect and exponential backoff.
 */
import { getAccessToken } from './axios'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

type MessageHandler = (data: unknown) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string
  private handlers: Set<MessageHandler> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(path: string) {
    this.url = `${WS_URL}${path}`
  }

  connect() {
    const token = getAccessToken()
    if (!token) return

    this.ws = new WebSocket(`${this.url}?token=${token}`)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handlers.forEach((handler) => handler(data))
      } catch {}
    }

    this.ws.onclose = () => {
      this.attemptReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }
}

export const notificationWS = new WebSocketManager('/ws/notifications/')
export default WebSocketManager
