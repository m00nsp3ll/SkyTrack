'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Socket } from 'socket.io-client'
import { connectSocket, disconnectSocket, joinRoom, leaveRoom, SOCKET_EVENTS } from '@/lib/socket'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinRoom: () => {},
  leaveRoom: () => {},
})

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) return

    const userData = JSON.parse(user)
    const s = connectSocket(token)
    setSocket(s)

    const onConnect = () => {
      setIsConnected(true)
      console.log('🔌 Socket connected')

      // Auto-join rooms based on role
      if (userData.role === 'ADMIN' || userData.role === 'OFFICE_STAFF') {
        joinRoom('admin')
      }
      if (userData.role === 'PILOT' && userData.pilotId) {
        joinRoom(`pilot:${userData.pilotId}`)
      }
      if (userData.role === 'MEDIA_SELLER') {
        joinRoom('media-seller')
      }
    }

    const onDisconnect = () => {
      setIsConnected(false)
      console.log('🔌 Socket disconnected')
    }

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)

    // If already connected
    if (s.connected) {
      onConnect()
    }

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      disconnectSocket()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocketContext = () => useContext(SocketContext)
