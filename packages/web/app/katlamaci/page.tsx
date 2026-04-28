'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import { initNativePush } from '@/lib/nativePush'
import { api } from '@/lib/api'

interface FlightInfo {
  flightId: string
  pilotName: string
  elapsedMinutes: number
  takeoffAt?: string
  waitMinutes?: number
  assignedAt?: string
  status?: string
}

export default function KatlamaciPage() {
  const [inFlight, setInFlight] = useState<FlightInfo[]>([])
  const [waiting, setWaiting] = useState<FlightInfo[]>([])
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(Date.now())
  const router = useRouter()
  const { socket } = useSocket()
  const fetchingRef = useRef(false)

  // Auth check — bir kez çalışır
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) { router.replace('/login'); return }
    try {
      const user = JSON.parse(userStr)
      if (!['KATLAMACI', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        router.replace('/login'); return
      }
    } catch { router.replace('/login'); return }
    initNativePush(token || undefined).catch(() => {})
    setReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch data
  const fetchData = async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await api.get('/katlamaci/live')
      setInFlight(res.data.data.inFlight)
      setWaiting(res.data.data.waiting)
    } catch {
      // sessiz hata
    } finally {
      fetchingRef.current = false
    }
  }

  // İlk yükleme + periyodik yenileme
  useEffect(() => {
    if (!ready) return
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Timer — süreleri güncelle
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  // Socket.IO
  useEffect(() => {
    if (!socket || !ready) return
    socket.emit('join:room', 'katlamaci')
    const handle = () => fetchData()
    socket.on('flight:takeoff', handle)
    socket.on('flight:pickup', handle)
    socket.on('flight:assigned', handle)
    socket.on('flight:landed', handle)
    socket.on('flight:cancelled', handle)
    socket.on('flight:status', handle)
    return () => {
      socket.off('flight:takeoff', handle)
      socket.off('flight:pickup', handle)
      socket.off('flight:assigned', handle)
      socket.off('flight:landed', handle)
      socket.off('flight:cancelled', handle)
      socket.off('flight:status', handle)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, ready])

  const calcMinutes = (dateStr?: string) => {
    if (!dateStr) return 0
    return Math.floor((now - new Date(dateStr).getTime()) / 60000)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
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
        <div>
          <h2 className="text-lg font-bold text-blue-700 mb-3">✈ Havada ({inFlight.length})</h2>
          <div className="space-y-3">
            {inFlight.length === 0 ? (
              <div className="bg-white rounded-lg p-4 text-gray-400 text-center">Havada pilot yok</div>
            ) : inFlight.map(f => (
              <div key={f.flightId} className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 text-lg">{f.pilotName}</span>
                  <div className="text-right">
                    <span className="text-blue-600 font-bold text-lg">{calcMinutes(f.takeoffAt)} dk</span>
                    <span className="text-xs text-gray-400 block">uçuş süresi</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-amber-700 mb-3">⏳ Bekliyor ({waiting.length})</h2>
          <div className="space-y-3">
            {waiting.length === 0 ? (
              <div className="bg-white rounded-lg p-4 text-gray-400 text-center">Bekleyen pilot yok</div>
            ) : waiting.map(f => (
              <div key={f.flightId} className="bg-white rounded-lg p-4 border-l-4 border-amber-500 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 text-lg">{f.pilotName}</span>
                  <div className="text-right">
                    <span className="text-amber-600 font-bold text-lg">{calcMinutes(f.assignedAt)} dk</span>
                    <span className="text-xs text-gray-400 block">bekleme</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
