'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { pilotsApi, flightsApi, mediaApi } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { SOCKET_EVENTS } from '@/lib/socket'
import {
  Plane,
  User,
  Phone,
  Scale,
  LogOut,
  CheckCircle,
  Coffee,
  Moon,
  RefreshCw,
  Clock,
  AlertTriangle,
  Wifi,
  WifiOff,
  Camera,
  FolderSync,
} from 'lucide-react'

interface UserData {
  id: string
  username: string
  role: string
  pilotId: string
  pilotName: string
}

interface Customer {
  id: string
  displayId: string
  firstName: string
  lastName: string
  phone: string
  weight: number
  createdAt: string
}

interface Flight {
  id: string
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_FLIGHT' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  customer: Customer
}

interface PilotData {
  id: string
  name: string
  status: 'AVAILABLE' | 'IN_FLIGHT' | 'ON_BREAK' | 'OFF_DUTY'
  dailyFlightCount: number
  maxDailyFlights: number
  queuePosition: number
}

interface PanelData {
  pilot: PilotData
  activeFlights: Flight[]
  completedFlights: Flight[]
  stats: {
    completed: number
    remaining: number
    inQueue: number
  }
}

const statusConfig = {
  AVAILABLE: { label: 'Müsait', color: 'bg-green-500', icon: CheckCircle },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-blue-500', icon: Plane },
  ON_BREAK: { label: 'Molada', color: 'bg-yellow-500', icon: Coffee },
  OFF_DUTY: { label: 'Mesai Dışı', color: 'bg-gray-500', icon: Moon },
}

export default function PilotPanel() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [panelData, setPanelData] = useState<PanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [notification, setNotification] = useState<string | null>(null)
  const [scanningMedia, setScanningMedia] = useState<string | null>(null)

  // Socket.IO hook
  const { on, socket } = useSocket({
    autoConnect: true,
    rooms: user?.pilotId ? [`pilot:${user.pilotId}`] : [],
  })

  const isConnected = socket?.connected ?? false

  const fetchPanelData = useCallback(async (pilotId: string) => {
    try {
      const response = await pilotsApi.getPanel(pilotId)
      setPanelData(response.data.data)
      setLastUpdate(new Date())
      setError('')
    } catch (err) {
      console.error('Failed to fetch panel data:', err)
      setError('Veri yüklenemedi')
    }
  }, [])

  // Initial load and auth check
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsed = JSON.parse(userData)
    if (parsed.role !== 'PILOT') {
      router.push('/admin')
      return
    }

    setUser(parsed)
    fetchPanelData(parsed.pilotId)
    setLoading(false)

    // Fallback polling every 10 seconds (Socket.IO handles real-time updates)
    const interval = setInterval(() => {
      fetchPanelData(parsed.pilotId)
    }, 10000)

    return () => clearInterval(interval)
  }, [router, fetchPanelData])

  // Socket.IO event listeners
  useEffect(() => {
    if (!user?.pilotId) return

    // New customer assigned
    const unsubAssigned = on(SOCKET_EVENTS.CUSTOMER_ASSIGNED, (data) => {
      console.log('🎯 New customer assigned:', data)
      setNotification(`Yeni müşteri atandı: ${data.customer.firstName} ${data.customer.lastName}`)
      fetchPanelData(user.pilotId)

      // Play notification sound
      try {
        const audio = new Audio('/sounds/notification.mp3')
        audio.play().catch(() => {})
      } catch (e) {}

      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }

      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    })

    // Flight events
    const unsubPickup = on(SOCKET_EVENTS.FLIGHT_PICKUP, () => {
      fetchPanelData(user.pilotId)
    })

    const unsubTakeoff = on(SOCKET_EVENTS.FLIGHT_TAKEOFF, () => {
      fetchPanelData(user.pilotId)
    })

    const unsubLanded = on(SOCKET_EVENTS.FLIGHT_LANDED, () => {
      fetchPanelData(user.pilotId)
    })

    // Limit warnings
    const unsubLimitWarning = on(SOCKET_EVENTS.PILOT_LIMIT_WARNING, (data) => {
      setNotification(data.message)
      setTimeout(() => setNotification(null), 5000)
    })

    const unsubLimitReached = on(SOCKET_EVENTS.PILOT_LIMIT_REACHED, (data) => {
      setNotification(data.message)
      setTimeout(() => setNotification(null), 8000)
    })

    return () => {
      unsubAssigned()
      unsubPickup()
      unsubTakeoff()
      unsubLanded()
      unsubLimitWarning()
      unsubLimitReached()
    }
  }, [user?.pilotId, on, fetchPanelData])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleStatusChange = async (status: string) => {
    if (!user) return
    setUpdating('status')
    try {
      await pilotsApi.updateStatus(user.pilotId, status)
      await fetchPanelData(user.pilotId)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Durum değiştirilemedi')
    } finally {
      setUpdating(null)
    }
  }

  const handleFlightAction = async (flightId: string, newStatus: string) => {
    setUpdating(flightId)
    try {
      await flightsApi.updateStatus(flightId, newStatus)
      if (user) {
        await fetchPanelData(user.pilotId)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'İşlem başarısız')
    } finally {
      setUpdating(null)
    }
  }

  const handleScanMedia = async (customerId: string) => {
    setScanningMedia(customerId)
    try {
      const response = await mediaApi.scanFolder(customerId)
      setNotification(response.data.message || 'Medya klasörü tarandı')
      setTimeout(() => setNotification(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Medya tarama başarısız')
    } finally {
      setScanningMedia(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const pilot = panelData?.pilot
  const activeFlights = panelData?.activeFlights || []
  const completedFlights = panelData?.completedFlights || []
  const stats = panelData?.stats
  const isAtLimit = pilot && pilot.dailyFlightCount >= pilot.maxDailyFlights
  const currentStatus = pilot ? statusConfig[pilot.status] : null
  const CurrentStatusIcon = currentStatus?.icon || CheckCircle

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-white text-primary text-lg">
                {user?.pilotName?.slice(0, 2).toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold text-lg">{user?.pilotName || user?.username}</h1>
              <div className="flex items-center gap-2 text-sm opacity-90">
                {currentStatus && (
                  <div className="flex items-center gap-1">
                    <CurrentStatusIcon className="h-3 w-3" />
                    <span>{currentStatus.label}</span>
                  </div>
                )}
                <span className="opacity-60">·</span>
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-green-300" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-300" />
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div className="bg-blue-600 text-white p-3 text-center animate-slide-up">
          {notification}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500 text-white p-3 text-center text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Kapat
          </button>
        </div>
      )}

      {/* Limit Warning */}
      {isAtLimit && (
        <div className="bg-yellow-500 text-white p-3 flex items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Günlük uçuş limitine ulaştınız!</span>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${isAtLimit ? 'text-red-600' : 'text-primary'}`}>
              {pilot?.dailyFlightCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Bugün</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats?.remaining || 0}</p>
            <p className="text-xs text-muted-foreground">Kalan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.inQueue || 0}</p>
            <p className="text-xs text-muted-foreground">Bekleyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Buttons (when not in flight) */}
      {pilot?.status !== 'IN_FLIGHT' && (
        <div className="px-4 mb-4">
          <p className="text-sm text-muted-foreground mb-2">Durumunuz:</p>
          <div className="grid grid-cols-3 gap-2">
            {(['AVAILABLE', 'ON_BREAK', 'OFF_DUTY'] as const).map((status) => {
              const cfg = statusConfig[status]
              const Icon = cfg.icon
              const isActive = pilot?.status === status
              return (
                <Button
                  key={status}
                  variant={isActive ? 'default' : 'outline'}
                  className={`flex-col h-auto py-3 ${isActive ? cfg.color : ''}`}
                  onClick={() => handleStatusChange(status)}
                  disabled={updating === 'status' || isActive}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{cfg.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Customers */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Aktif Müşteriler</h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lastUpdate.toLocaleTimeString('tr-TR')}
          </span>
        </div>

        {activeFlights.length === 0 ? (
          <Card className="mb-4">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Henüz atanmış müşteri yok</p>
              <p className="text-sm mt-1">Yeni müşteri atandığında burada görünecek</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeFlights.map((flight, index) => {
              const isFirst = index === 0
              const customer = flight.customer

              return (
                <Card
                  key={flight.id}
                  className={`${isFirst ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="p-4">
                    {/* Customer Info */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {customer.displayId}
                        </p>
                        <h3 className="font-semibold text-lg">
                          {customer.firstName} {customer.lastName}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          flight.status === 'IN_FLIGHT'
                            ? 'bg-blue-100 text-blue-700'
                            : flight.status === 'PICKED_UP'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {flight.status === 'ASSIGNED' && 'Bekliyor'}
                        {flight.status === 'PICKED_UP' && 'Alındı'}
                        {flight.status === 'IN_FLIGHT' && 'Uçuşta'}
                      </span>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${customer.phone}`} className="text-primary">
                          {customer.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Scale className="h-4 w-4" />
                        <span>{customer.weight} kg</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isFirst && (
                      <div className="grid grid-cols-1 gap-2">
                        {flight.status === 'ASSIGNED' && (
                          <Button
                            size="lg"
                            className="w-full h-14 text-lg bg-yellow-500 hover:bg-yellow-600"
                            onClick={() => handleFlightAction(flight.id, 'PICKED_UP')}
                            disabled={updating === flight.id}
                          >
                            {updating === flight.id ? (
                              <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <User className="h-5 w-5 mr-2" />
                                Müşteriyi Aldım
                              </>
                            )}
                          </Button>
                        )}

                        {flight.status === 'PICKED_UP' && (
                          <Button
                            size="lg"
                            className="w-full h-14 text-lg bg-blue-500 hover:bg-blue-600"
                            onClick={() => handleFlightAction(flight.id, 'IN_FLIGHT')}
                            disabled={updating === flight.id}
                          >
                            {updating === flight.id ? (
                              <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <Plane className="h-5 w-5 mr-2" />
                                Uçuşa Başladım
                              </>
                            )}
                          </Button>
                        )}

                        {flight.status === 'IN_FLIGHT' && (
                          <Button
                            size="lg"
                            className="w-full h-14 text-lg bg-green-500 hover:bg-green-600"
                            onClick={() => handleFlightAction(flight.id, 'COMPLETED')}
                            disabled={updating === flight.id}
                          >
                            {updating === flight.id ? (
                              <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Uçuş Tamamlandı
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Completed Flights */}
      {completedFlights.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-lg font-semibold mb-3">
            Tamamlanan Uçuşlar ({completedFlights.length})
          </h2>
          <div className="space-y-2">
            {completedFlights.slice(0, 5).map((flight) => (
              <Card key={flight.id} className="bg-green-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">
                        {flight.customer.firstName} {flight.customer.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {flight.customer.displayId}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleScanMedia(flight.customer.id)}
                    disabled={scanningMedia === flight.customer.id}
                  >
                    {scanningMedia === flight.customer.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FolderSync className="h-4 w-4 mr-2" />
                    )}
                    Medya Klasörünü Tara
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Safe Area */}
      <div className="h-8" />
    </div>
  )
}
