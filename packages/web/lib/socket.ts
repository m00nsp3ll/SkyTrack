import { io, Socket } from 'socket.io-client'

// Dynamic socket URL based on current protocol and hostname
function getSocketUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://localhost:3001'
  }
  const hostname = window.location.hostname

  // Custom domain - use api subdomain
  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://api.skytrackyp.com'
  }

  // Cloudflare tunnel
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname.replace(/^[^.]+/, 'api')}`
  }

  // Local network
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  return `${protocol}//${hostname}:3001`
}

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    })
  }
  return socket
}

export const connectSocket = (token?: string): Socket => {
  const s = getSocket()

  if (token) {
    s.auth = { token }
  }

  if (!s.connected) {
    s.connect()
  }

  return s
}

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export const joinRoom = (room: string): void => {
  const s = getSocket()
  if (s.connected) {
    s.emit('join:room', room)
  }
}

export const leaveRoom = (room: string): void => {
  const s = getSocket()
  if (s.connected) {
    s.emit('leave:room', room)
  }
}

// Socket event types
export interface FlightEvent {
  flight: {
    id: string
    status: string
    durationMinutes?: number
  }
  pilot: {
    id: string
    name: string
  }
  customer: {
    id: string
    displayId: string
    name: string
  }
}

export interface CustomerAssignedEvent {
  flight: {
    id: string
    status: string
  }
  customer: {
    id: string
    displayId: string
    firstName: string
    lastName: string
    phone: string
    weight: number
  }
  pilot: {
    id: string
    name: string
  }
}

export interface PilotStatusEvent {
  pilotId: string
  pilotName: string
  status: string
}

export interface PilotLimitEvent {
  message: string
}

// Event names
export const SOCKET_EVENTS = {
  // Flight events
  FLIGHT_ASSIGNED: 'flight:assigned',
  FLIGHT_PICKUP: 'flight:pickup',
  FLIGHT_TAKEOFF: 'flight:takeoff',
  FLIGHT_LANDED: 'flight:landed',
  FLIGHT_CANCELLED: 'flight:cancelled',

  // Pilot events
  PILOT_STATUS_CHANGED: 'pilot:status-changed',
  PILOT_LIMIT_WARNING: 'pilot:limit-warning',
  PILOT_LIMIT_REACHED: 'pilot:limit-reached',
  PILOT_QUEUE_UPDATED: 'pilot:queue-updated',

  // Customer events
  CUSTOMER_ASSIGNED: 'customer:assigned',
} as const
