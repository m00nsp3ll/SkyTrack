'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { flightsApi, api } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { SOCKET_EVENTS } from '@/lib/socket'
import {
  Plane,
  Users,
  CheckCircle,
  Clock,
  RefreshCw,
  User,
  UserPlus,
  Coffee,
  Moon,
  AlertTriangle,
  XCircle,
  List,
  Wifi,
  WifiOff,
  SkipForward,
} from 'lucide-react'

interface Customer {
  id: string
  displayId: string
  firstName: string
  lastName: string
  weight: number
  emergencyContact?: string | null
  createdAt: string
}

interface Pilot {
  id: string
  name: string
  status: 'AVAILABLE' | 'ASSIGNED' | 'PICKED_UP' | 'IN_FLIGHT' | 'ON_BREAK' | 'OFF_DUTY' | 'UNAVAILABLE'
  dailyFlightCount: number
  maxDailyFlights: number
}

interface Flight {
  id: string
  status: string
  createdAt: string
  takeoffAt?: string
  landingAt?: string
  durationMinutes?: number
  elapsedMinutes?: number
  waitMinutes?: number
  cancellationReason?: 'WEATHER' | 'CUSTOMER_CANCEL' | 'OTHER' | null
  cancellationNote?: string | null
  notes?: string | null
  customer: Customer
  pilot: Pilot
}

const cancelReasonLabels: Record<string, { label: string; emoji: string; color: string }> = {
  WEATHER: { label: 'Kötü Hava', emoji: '🌧️', color: 'bg-gray-100 text-gray-700' },
  CUSTOMER_CANCEL: { label: 'Müşteri İptal', emoji: '👤', color: 'bg-purple-100 text-purple-700' },
  OTHER: { label: 'Diğer', emoji: '⚠️', color: 'bg-orange-100 text-orange-700' },
}

interface LiveData {
  inFlight: Flight[]
  waiting: Flight[]
  completed: Flight[]
  cancelled: Flight[]
  pilots: Pilot[]
  stats: {
    totalToday: number
    inFlightCount: number
    waitingCount: number
    completedCount: number
    cancelledCount: number
    availablePilots: number
    avgDuration: number
  }
}

const pilotStatusConfig = {
  AVAILABLE: { label: 'Müsait', color: 'bg-green-500', textColor: 'text-green-600', icon: CheckCircle },
  ASSIGNED: { label: 'Müşteri Atandı', color: 'bg-purple-500', textColor: 'text-purple-600', icon: UserPlus },
  PICKED_UP: { label: 'Müşteri Alındı', color: 'bg-blue-400', textColor: 'text-blue-500', icon: User },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-blue-500', textColor: 'text-blue-600', icon: Plane },
  ON_BREAK: { label: 'Molada', color: 'bg-yellow-500', textColor: 'text-yellow-600', icon: Coffee },
  OFF_DUTY: { label: 'Mesai Dışı', color: 'bg-gray-500', textColor: 'text-gray-500', icon: Moon },
  UNAVAILABLE: { label: 'Müsait Değil', color: 'bg-orange-500', textColor: 'text-orange-600', icon: Moon },
} as const

export default function LiveFlightsPage() {
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [queueHistory, setQueueHistory] = useState<any[]>([])
  const [showBulkCancel, setShowBulkCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [splitAt, setSplitAt] = useState<number | null>(null) // hangi index'te ayırıcı var

  // Manuel admin status değiştirme — uygulaması olmayan pilotlar için
  const adminUpdateStatus = async (flightId: string, newStatus: string) => {
    const labels: Record<string, string> = {
      PICKED_UP: 'Müşteri alındı olarak işaretlensin mi?',
      IN_FLIGHT: 'Uçuş başlatılsın mı?',
      COMPLETED: 'Uçuş tamamlandı (güvenli iniş) olarak işaretlensin mi?',
    }
    if (!confirm(labels[newStatus] || 'Onaylıyor musunuz?')) return
    setUpdatingId(flightId)
    try {
      await flightsApi.updateStatus(flightId, newStatus)
      await fetchData()
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'İşlem başarısız')
    } finally {
      setUpdatingId(null)
    }
  }

  const { on, socket } = useSocket({ autoConnect: true, rooms: ['admin'] })
  const isConnected = socket?.connected ?? false

  const fetchData = async () => {
    try {
      const liveRes = await flightsApi.getLive()
      setData(liveRes.data.data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch live data:', error)
    } finally {
      setLoading(false)
    }
    // Sıra geçmişi ayrı — hata verse de ana veriyi etkilemesin
    try {
      const histRes = await api.get('/flights/queue-history')
      setQueueHistory(histRes.data.data?.history || [])
    } catch {}
  }


  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  // Socket.IO listeners
  useEffect(() => {
    const events = [
      SOCKET_EVENTS.FLIGHT_PICKUP,
      SOCKET_EVENTS.FLIGHT_TAKEOFF,
      SOCKET_EVENTS.FLIGHT_LANDED,
      SOCKET_EVENTS.FLIGHT_CANCELLED,
      SOCKET_EVENTS.PILOT_STATUS_CHANGED,
    ]

    const unsubscribes = events.map((event) =>
      on(event, () => {
        fetchData()
      })
    )

    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
  }, [on])

  const handleBulkCancel = async () => {
    if (!confirm('Tüm bekleyen uçuşları iptal etmek istediğinizden emin misiniz?')) return

    setCancelling(true)
    try {
      const response = await flightsApi.bulkCancel('Hava muhalefeti')
      alert(response.data.message)
      setShowBulkCancel(false)
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Toplu iptal başarısız')
    } finally {
      setCancelling(false)
    }
  }

  const getFlightColor = (elapsedMinutes?: number) => {
    if (!elapsedMinutes) return 'border-blue-200'
    if (elapsedMinutes >= 30) return 'border-red-500 bg-red-50'
    if (elapsedMinutes >= 20) return 'border-yellow-500 bg-yellow-50'
    return 'border-blue-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const stats = data?.stats
  const inFlight = data?.inFlight || []
  const waiting = data?.waiting || []
  const completed = data?.completed || []
  const pilots = data?.pilots || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Canlı Uçuş Takibi</h1>
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/flights/list">
            <Button variant="outline">
              <List className="h-4 w-4 mr-2" />
              Uçuş Geçmişi
            </Button>
          </Link>
          <Link href="/admin/flights/list?status=CANCELLED">
            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              <XCircle className="h-4 w-4 mr-2" />
              İptal Geçmişi
            </Button>
          </Link>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          {waiting.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowBulkCancel(!showBulkCancel)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Toplu İptal
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Cancel Confirmation */}
      {showBulkCancel && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-700">Toplu İptal Onayı</p>
                  <p className="text-sm text-red-600">
                    {waiting.length} bekleyen uçuş iptal edilecek (hava muhalefeti nedeniyle)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleBulkCancel}
                  disabled={cancelling}
                >
                  {cancelling ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Onayla'}
                </Button>
                <Button variant="outline" onClick={() => setShowBulkCancel(false)}>
                  Vazgeç
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats?.totalToday || 0}</p>
            <p className="text-sm text-muted-foreground">Bugün Toplam</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.inFlightCount || 0}</p>
            <p className="text-sm text-blue-600">Havada</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats?.waitingCount || 0}</p>
            <p className="text-sm text-yellow-600">Bekliyor</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats?.completedCount || 0}</p>
            <p className="text-sm text-green-600">Tamamlandı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats?.availablePilots || 0}</p>
            <p className="text-sm text-muted-foreground">Müsait Pilot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats?.avgDuration || 0}</p>
            <p className="text-sm text-muted-foreground">Ort. Süre (dk)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* In Flight */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50 border-b border-blue-200">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Plane className="h-5 w-5" />
              Havada ({inFlight.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {inFlight.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Şu an havada uçuş yok
              </p>
            ) : (
              <div className="space-y-3">
                {inFlight.map((flight) => (
                  <Card key={flight.id} className="bg-blue-50">
                    <CardContent className="p-3">
                      <Link href={`/admin/customers/${flight.customer.displayId}`}>
                        <div className="flex items-start justify-between mb-2 cursor-pointer hover:opacity-80">
                          <div>
                            <p className="font-bold text-lg">{flight.pilot.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {flight.customer.firstName} {flight.customer.lastName} — {flight.customer.weight} kg
                            </p>
                            {flight.customer.emergencyContact && (
                              <p className="text-xs text-muted-foreground">🏨 {flight.customer.emergencyContact}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{flight.customer.displayId}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              flight.elapsedMinutes && flight.elapsedMinutes >= 30 ? 'text-red-600' :
                              flight.elapsedMinutes && flight.elapsedMinutes >= 20 ? 'text-yellow-600' :
                              'text-blue-600'
                            }`}>
                              {flight.elapsedMinutes || 0} dk
                            </p>
                            <p className="text-xs text-muted-foreground">uçuş süresi</p>
                          </div>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={(e) => { e.stopPropagation(); adminUpdateStatus(flight.id, 'COMPLETED') }}
                          disabled={updatingId === flight.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {updatingId === flight.id ? 'İşleniyor...' : 'Güvenli İniş'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                          onClick={(e) => { e.stopPropagation(); adminUpdateStatus(flight.id, 'PICKED_UP') }}
                          disabled={updatingId === flight.id}
                        >
                          ↩
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waiting */}
        <Card className="border-yellow-200">
          <CardHeader className="bg-yellow-50 border-b border-yellow-200">
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Users className="h-5 w-5" />
              Bekliyor ({waiting.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {waiting.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Bekleyen müşteri yok
              </p>
            ) : (
              <div className="space-y-3">
                {waiting.map((flight, idx) => {
                  // Grup ayırıcı: önceki müşteriyle 10+ dk fark varsa çizgi çek
                  const prevFlight = idx > 0 ? waiting[idx - 1] : null
                  // Ayırıcı: splitAt varsa onu kullan, yoksa otomatik 10dk boşluk
                  const autoSep = prevFlight && Math.abs(new Date(flight.createdAt).getTime() - new Date(prevFlight.createdAt).getTime()) > 10 * 60 * 1000
                  if (autoSep && splitAt === null) { setTimeout(() => setSplitAt(idx), 0) }
                  const showSeparator = splitAt !== null ? idx === splitAt : autoSep
                  return (<>
                  {showSeparator && (() => {
                    // Bu gruptan sonraki kişi sayısını hesapla
                    let groupCount = 0
                    for (let j = idx; j < waiting.length; j++) {
                      if (j > idx) {
                        const pTime = new Date(waiting[j - 1].createdAt).getTime()
                        const cTime = new Date(waiting[j].createdAt).getTime()
                        if (Math.abs(cTime - pTime) > 10 * 60 * 1000) break
                      }
                      groupCount++
                    }
                    const upperCount = idx
                    return (
                      <div>
                        <div className="text-center py-0.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'#fef3c7',color:'#92400e'}}>Grup 1 — {upperCount} kişi</span></div>
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="flex-1 h-0.5" style={{ background: 'linear-gradient(to right, transparent, #ef4444, #ef4444, transparent)' }} />
                          <button onClick={() => setSplitAt(s => s !== null && s < waiting.length ? s + 1 : s)} className="text-[11px] px-2 py-1 rounded-full font-bold" style={{background:'#dcfce7',color:'#16a34a'}}>+Ekle</button>
                          <span className="text-[10px] font-bold text-red-500 whitespace-nowrap">Grup 2 — {groupCount} kişi</span>
                          <button onClick={() => setSplitAt(s => s !== null && s > 1 ? s - 1 : s)} className="text-[11px] px-2 py-1 rounded-full font-bold" style={{background:'#fee2e2',color:'#dc2626'}}>−Çıkar</button>
                          <div className="flex-1 h-0.5" style={{ background: 'linear-gradient(to left, transparent, #ef4444, #ef4444, transparent)' }} />
                        </div>
                      </div>
                    )
                  })()}
                  <Card key={flight.id} className="bg-yellow-50">
                    <CardContent className="p-3">
                      <Link href={`/admin/customers/${flight.customer.displayId}`}>
                        <div className="flex items-start justify-between mb-2 cursor-pointer hover:opacity-80">
                          <div>
                            <p className="font-bold text-lg">{flight.pilot.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {flight.customer.firstName} {flight.customer.lastName} — {flight.customer.weight} kg
                            </p>
                            {flight.customer.emergencyContact && (
                              <p className="text-xs text-muted-foreground">🏨 {flight.customer.emergencyContact}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{flight.customer.displayId}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-yellow-600">
                              {flight.waitMinutes || 0} dk
                            </p>
                            <p className="text-xs text-muted-foreground">bekleme</p>
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          flight.status === 'PICKED_UP' ? 'bg-yellow-200 text-yellow-700' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {flight.status === 'PICKED_UP' ? 'Alındı' : 'Atandı'}
                        </span>
                      </div>
                      {/* Manuel admin status butonları */}
                      {flight.status === 'ASSIGNED' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={(e) => { e.stopPropagation(); adminUpdateStatus(flight.id, 'PICKED_UP') }}
                            disabled={updatingId === flight.id}
                          >
                            <User className="h-4 w-4 mr-1" />
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm(`${flight.pilot.name} pilotuna feragat yazılıp müşteri sıradaki pilota geçsin mi?`)) return
                              setUpdatingId(flight.id)
                              try {
                                await api.post(`/flights/${flight.id}/forfeit-reassign`)
                                await fetchData()
                              } catch (err: any) {
                                alert(err.response?.data?.error?.message || 'Feragat başarısız')
                              } finally { setUpdatingId(null) }
                            }}
                            disabled={updatingId === flight.id}
                          >
                            <SkipForward className="h-4 w-4 mr-1" />
                            Feragat
                          </Button>
                        </div>
                      )}
                      {flight.status === 'PICKED_UP' && (
                        <Button
                          size="sm"
                          className="w-full bg-blue-500 hover:bg-blue-600"
                          onClick={(e) => { e.stopPropagation(); adminUpdateStatus(flight.id, 'IN_FLIGHT') }}
                          disabled={updatingId === flight.id}
                        >
                          <Plane className="h-4 w-4 mr-1" />
                          {updatingId === flight.id ? 'İşleniyor...' : 'Uçuşa Başla'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                  </>)})}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50 border-b border-green-200">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Tamamlandı ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 max-h-[500px] overflow-y-auto">
            {completed.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Bugün tamamlanan uçuş yok
              </p>
            ) : (
              <div className="space-y-2">
                {completed.slice(0, 15).map((flight) => (
                  <Link key={flight.id} href={`/admin/customers/${flight.customer.displayId}`}>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer text-sm">
                      <div>
                        <p className="font-bold">{flight.pilot.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {flight.customer.firstName} {flight.customer.lastName} — {flight.customer.weight} kg
                        </p>
                        {flight.customer.emergencyContact && (
                          <p className="text-xs text-muted-foreground">🏨 {flight.customer.emergencyContact}</p>
                        )}
                      </div>
                      {flight.durationMinutes && (
                        <span className="text-xs text-green-600 font-medium">{flight.durationMinutes} dk</span>
                      )}
                    </div>
                  </Link>
                ))}
                {completed.length > 15 && (
                  <Link href="/admin/flights/list?status=COMPLETED">
                    <p className="text-center text-sm text-primary pt-2 cursor-pointer hover:underline">
                      +{completed.length - 15} daha...
                    </p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancelled Flights — iptal edilen uçuşlar ve nedenleri */}
      {data && data.cancelled && data.cancelled.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50 border-b border-red-200">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              İptal Edilen Uçuşlar ({data.cancelled.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {data.cancelled.map((flight) => {
                const reason = flight.cancellationReason ? cancelReasonLabels[flight.cancellationReason] : null
                return (
                  <div key={flight.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/admin/customers/${flight.customer.displayId}`}>
                          <p className="font-bold truncate hover:underline cursor-pointer">{flight.pilot.name}</p>
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {flight.customer.firstName} {flight.customer.lastName} ({flight.customer.displayId})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(flight.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {reason && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${reason.color}`}>
                          {reason.emoji} {reason.label}
                        </span>
                      )}
                    </div>
                    {flight.cancellationNote && (
                      <p className="text-sm text-gray-700 italic border-t pt-2 mt-2">
                        💬 {flight.cancellationNote}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uçuş + Feragat Geçmişi */}
      {queueHistory.length > 0 && (
        <Card>
          <CardHeader className="bg-blue-50 border-b border-blue-200">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <List className="h-5 w-5" />
              Uçuş + Feragat ({queueHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-96 overflow-y-auto">
              {queueHistory.map((item: any, i: number) => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-2 text-sm`}
                  style={{ background: item.type === 'FERAGAT' ? '#fef2f2' : item.type === 'İPTAL' ? '#fefce8' : 'transparent' }}>
                  <span className="text-xs text-gray-400 w-6 text-right">{i + 1}</span>
                  <span className="w-20 text-xs font-semibold px-2 py-0.5 rounded text-center"
                    style={{
                      background: item.type === 'UÇUŞ' ? '#dcfce7' : item.type === 'FERAGAT' ? '#fee2e2' : item.type === 'HAVA İPTAL' ? '#dbeafe' : '#fef9c3',
                      color: item.type === 'UÇUŞ' ? '#15803d' : item.type === 'FERAGAT' ? '#b91c1c' : item.type === 'HAVA İPTAL' ? '#1d4ed8' : '#a16207',
                    }}>
                    {item.type}
                  </span>
                  <span className="font-semibold w-40 truncate">{item.pilotName}</span>
                  <span className="text-gray-500 text-xs flex-1 truncate">
                    {item.customerDisplayId} — {item.customerName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {item.notes && <span className="text-xs text-gray-400 italic truncate max-w-32">💬 {item.notes}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Pilot Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Pilot Durumları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {pilots.map((pilot) => {
              const status = pilotStatusConfig[pilot.status] || pilotStatusConfig.AVAILABLE
              const StatusIcon = status.icon
              const isAtLimit = pilot.dailyFlightCount >= pilot.maxDailyFlights

              return (
                <Link key={pilot.id} href={`/admin/pilots/${pilot.id}`}>
                  <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isAtLimit ? 'border-red-300' : ''}`}>
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <StatusIcon className={`h-4 w-4 ${status.textColor}`} />
                        {isAtLimit && <AlertTriangle className="h-3 w-3 text-red-500" />}
                      </div>
                      <p className="font-medium text-sm truncate">{pilot.name}</p>
                      <p className={`text-xs ${isAtLimit ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                        {pilot.dailyFlightCount}/{pilot.maxDailyFlights}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs text-white ${status.color}`}>
                        {status.label}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
