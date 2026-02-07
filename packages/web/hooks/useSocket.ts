'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket, connectSocket, disconnectSocket, joinRoom, leaveRoom } from '@/lib/socket'

interface UseSocketOptions {
  autoConnect?: boolean
  rooms?: string[]
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, rooms = [] } = options
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (autoConnect) {
      const token = localStorage.getItem('token')
      socketRef.current = connectSocket(token || undefined)

      // Join rooms
      socketRef.current.on('connect', () => {
        rooms.forEach((room) => {
          joinRoom(room)
        })
      })

      return () => {
        rooms.forEach((room) => {
          leaveRoom(room)
        })
      }
    }
  }, [autoConnect, rooms])

  const on = useCallback((event: string, callback: (data: any) => void) => {
    const socket = getSocket()
    socket.on(event, callback)
    return () => {
      socket.off(event, callback)
    }
  }, [])

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    const socket = getSocket()
    socket.off(event, callback)
  }, [])

  const emit = useCallback((event: string, data?: any) => {
    const socket = getSocket()
    if (socket.connected) {
      socket.emit(event, data)
    }
  }, [])

  return {
    socket: socketRef.current,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    connect: connectSocket,
    disconnect: disconnectSocket,
  }
}
