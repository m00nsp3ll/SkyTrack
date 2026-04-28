'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface FlightInfo {
  flightId: string
  pilotName: string
  takeoffAt?: string
  assignedAt?: string
}

export default function KatlamaciPage() {
  const [inFlight, setInFlight] = useState<FlightInfo[]>([])
  const [waiting, setWaiting] = useState<FlightInfo[]>([])
  const [tick, setTick] = useState(Date.now())

  useEffect(() => {
    // Auth check
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) { window.location.href = '/login'; return }
    try {
      const user = JSON.parse(userStr)
      if (!['KATLAMACI', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        window.location.href = '/login'; return
      }
    } catch { window.location.href = '/login'; return }

    // Veri çek
    const load = () => {
      api.get('/katlamaci/live').then(res => {
        setInFlight(res.data.data.inFlight)
        setWaiting(res.data.data.waiting)
      }).catch(() => {})
    }

    load()
    const dataInterval = setInterval(load, 15000)
    const tickInterval = setInterval(() => setTick(Date.now()), 30000)
    return () => { clearInterval(dataInterval); clearInterval(tickInterval) }
  }, [])

  const mins = (d?: string) => d ? Math.floor((tick - new Date(d).getTime()) / 60000) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">SkyTrack Katlamacı</h1>
        <button onClick={() => { localStorage.clear(); window.location.href = '/login' }} className="text-sm text-red-500">Çıkış</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold text-blue-700 mb-3">✈ Havada ({inFlight.length})</h2>
          {inFlight.length === 0 ? (
            <div className="bg-white rounded-lg p-4 text-gray-400 text-center">Havada pilot yok</div>
          ) : inFlight.map(f => (
            <div key={f.flightId} className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm mb-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800 text-lg">{f.pilotName}</span>
                <div className="text-right">
                  <span className="text-blue-600 font-bold text-lg">{mins(f.takeoffAt)} dk</span>
                  <span className="text-xs text-gray-400 block">uçuş süresi</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-bold text-amber-700 mb-3">⏳ Bekliyor ({waiting.length})</h2>
          {waiting.length === 0 ? (
            <div className="bg-white rounded-lg p-4 text-gray-400 text-center">Bekleyen pilot yok</div>
          ) : waiting.map(f => (
            <div key={f.flightId} className="bg-white rounded-lg p-4 border-l-4 border-amber-500 shadow-sm mb-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800 text-lg">{f.pilotName}</span>
                <div className="text-right">
                  <span className="text-amber-600 font-bold text-lg">{mins(f.assignedAt)} dk</span>
                  <span className="text-xs text-gray-400 block">bekleme</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
