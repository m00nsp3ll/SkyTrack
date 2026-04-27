'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'

interface FlightInfo {
  flightId: string
  pilotName: string
  elapsedMinutes: number
  takeoffAt?: string
  waitMinutes?: number
  assignedAt?: string
  status?: string
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001/api'
}

export default function KatlamaciPage() {
  const [inFlight, setInFlight] = useState<FlightInfo[]>([])
  const [waiting, setWaiting] = useState<FlightInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const router = useRouter()
  const { socket } = useSocket()

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) {
      router.replace('/login')
      return
    }
    const user = JSON.parse(userStr)
    if (!['KATLAMACI', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.replace('/login')
    }
  }, [router])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${getBaseUrl()}/katlamaci/live`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      setInFlight(data.data.inFlight)
      setWaiting(data.data.waiting)
    } catch {
      console.error('Veri alınamadı')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // 30 saniyede bir yenile
    return () => clearInterval(interval)
  }, [fetchData])

  // Timer — her 30 saniye güncelle
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  // Socket.IO
  useEffect(() => {
    if (!socket) return
    socket.emit('join:room', 'katlamaci')

    const handleEvent = () => fetchData()
    socket.on('flight:takeoff', handleEvent)
    socket.on('flight:pickup', handleEvent)
    socket.on('flight:assigned', handleEvent)
    socket.on('flight:landed', handleEvent)
    socket.on('flight:cancelled', handleEvent)
    socket.on('flight:status', handleEvent)

    return () => {
      socket.off('flight:takeoff', handleEvent)
      socket.off('flight:pickup', handleEvent)
      socket.off('flight:assigned', handleEvent)
      socket.off('flight:landed', handleEvent)
      socket.off('flight:cancelled', handleEvent)
      socket.off('flight:status', handleEvent)
    }
  }, [socket, fetchData])

  const calcMinutes = (dateStr?: string) => {
    if (!dateStr) return 0
    return Math.floor((now - new Date(dateStr).getTime()) / 60000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">SkyTrack Katlamacı</h1>
        <button
          onClick={() => { localStorage.clear(); router.replace('/login') }}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Çıkış
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Havada */}
        <div>
          <h2 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
            ✈ Havada ({inFlight.length})
          </h2>
          <div className="space-y-3">
            {inFlight.length === 0 ? (
              <div className="bg-white rounded-lg p-4 text-gray-400 text-center">Havada pilot yok</div>
            ) : (
              inFlight.map(f => (
                <div key={f.flightId} className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-lg">{f.pilotName}</span>
                    <span className="text-blue-600 font-bold text-lg">
                      {calcMinutes(f.takeoffAt)} dk
                      <span className="text-xs text-gray-400 block text-right">uçuş süresi</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bekliyor */}
        <div>
          <h2 className="text-lg font-bold text-amber-700 mb-3 flex items-center gap-2">
            ⏳ Bekliyor ({waiting.length})
          </h2>
          <div className="space-y-3">
            {waiting.length === 0 ? (
              <div className="bg-white rounded-lg p-4 text-gray-400 text-center">Bekleyen pilot yok</div>
            ) : (
              waiting.map(f => (
                <div key={f.flightId} className="bg-white rounded-lg p-4 border-l-4 border-amber-500 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-lg">{f.pilotName}</span>
                    <span className="text-amber-600 font-bold text-lg">
                      {calcMinutes(f.assignedAt)} dk
                      <span className="text-xs text-gray-400 block text-right">bekleme</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
