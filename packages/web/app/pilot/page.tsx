'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { pilotsApi, flightsApi, mediaApi, fcmApi } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { SOCKET_EVENTS } from '@/lib/socket'
import { PushNotificationManager } from '@/components/pwa/PushNotificationManager'
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallGuide'
import { initNativePush, cleanupFcmToken } from '@/lib/nativePush'
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
  QrCode,
  X,
  ListOrdered,
  MessageSquare,
  Users,
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
  inQueue: boolean
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
  const [showProfileSidebar, setShowProfileSidebar] = useState(false)
  const [selectedQRCustomer, setSelectedQRCustomer] = useState<Customer | null>(null)
  const [selectedQRType, setSelectedQRType] = useState<'admin' | 'media'>('admin')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationList, setNotificationList] = useState<{ id: string; text: string; time: Date; read: boolean }[]>([])
  const [showQueueModal, setShowQueueModal] = useState(false)
  const [queueList, setQueueList] = useState<{ id: string; name: string; status: string; queuePosition: number; dailyFlightCount: number; maxDailyFlights: number; inQueue: boolean }[]>([])

  // WebSocket: bağlantıyı user bekleme — token varsa hemen bağlan
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const { on, socket } = useSocket({
    autoConnect: true,
    rooms: user?.pilotId ? [`pilot:${user.pilotId}`, 'pilots'] : ['pilots'],
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

  const fetchQueueList = useCallback(async () => {
    try {
      const response = await pilotsApi.getQueue()
      const data = response.data
      if (data.success) setQueueList(data.data.queue || [])
    } catch {}
  }, [])

  // Initial load and auth check
  useEffect(() => {
    // Redirect www to non-www to keep localStorage consistent
    if (typeof window !== 'undefined' && window.location.hostname === 'www.skytrackyp.com') {
      window.location.href = window.location.href.replace('www.skytrackyp.com', 'skytrackyp.com')
      return
    }

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
    fetchQueueList()
    setLoading(false)

    // API'den bugünkü bildirimleri yükle
    fcmApi.getPilotNotifications(parsed.pilotId)
      .then(res => {
        if (res.data?.data?.length > 0) {
          const apiNotifs = res.data.data.map((n: any) => ({
            id: n.id,
            text: `${n.title}: ${n.body}`,
            time: new Date(n.createdAt),
            read: false,
          }))
          setNotificationList(apiNotifs)
        } else {
          try {
            const saved = localStorage.getItem(`notifs_${parsed.pilotId}`)
            if (saved) {
              const parsedNotifs = JSON.parse(saved)
              const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
              const todayNotifs = parsedNotifs
                .map((n: any) => ({ ...n, time: new Date(n.time), read: n.read ?? false }))
                .filter((n: any) => n.time >= todayStart)
              setNotificationList(todayNotifs)
            }
          } catch {}
        }
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem(`notifs_${parsed.pilotId}`)
          if (saved) {
            const parsedNotifs = JSON.parse(saved)
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
            const todayNotifs = parsedNotifs
              .map((n: any) => ({ ...n, time: new Date(n.time), read: n.read ?? false }))
              .filter((n: any) => n.time >= todayStart)
            setNotificationList(todayNotifs)
          }
        } catch {}
      })

    // Initialize native push notifications (Capacitor/FCM)
    initNativePush(token || undefined).catch(console.error)

    // Fallback polling every 10 seconds (Socket.IO handles real-time updates)
    const interval = setInterval(() => {
      fetchPanelData(parsed.pilotId)
    }, 10000)

    return () => clearInterval(interval)
  }, [router, fetchPanelData, fetchQueueList])

  // Socket.IO event listeners
  useEffect(() => {
    if (!user?.pilotId) return

    const addNotif = (text: string) => {
      const notif = { id: Math.random().toString(36).slice(2), text, time: new Date(), read: false }
      setNotificationList(prev => {
        const updated = [notif, ...prev]
        try {
          const toSave = updated.map(n => ({ ...n, time: n.time.toISOString() }))
          localStorage.setItem(`notifs_${user.pilotId}`, JSON.stringify(toSave))
        } catch {}
        return updated
      })
    }

    // New customer assigned
    const unsubAssigned = on(SOCKET_EVENTS.CUSTOMER_ASSIGNED, (data) => {
      console.log('🎯 New customer assigned:', data)
      const text = `Yeni müşteri atandı: ${data.customer.firstName} ${data.customer.lastName}`
      setNotification(text)
      addNotif(text)
      fetchPanelData(user.pilotId)
      fetchQueueList()

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

    // Flight events — queue da güncelle
    const unsubPickup = on(SOCKET_EVENTS.FLIGHT_PICKUP, () => {
      fetchPanelData(user.pilotId)
      fetchQueueList()
    })

    const unsubTakeoff = on(SOCKET_EVENTS.FLIGHT_TAKEOFF, () => {
      fetchPanelData(user.pilotId)
      fetchQueueList()
    })

    const unsubLanded = on(SOCKET_EVENTS.FLIGHT_LANDED, () => {
      fetchPanelData(user.pilotId)
      fetchQueueList()
    })

    // Limit warnings
    const unsubLimitWarning = on(SOCKET_EVENTS.PILOT_LIMIT_WARNING, (data) => {
      setNotification(data.message)
      addNotif(data.message)
      fetchQueueList()
      setTimeout(() => setNotification(null), 5000)
    })

    const unsubLimitReached = on(SOCKET_EVENTS.PILOT_LIMIT_REACHED, (data) => {
      setNotification(data.message)
      addNotif(data.message)
      fetchQueueList()
      setTimeout(() => setNotification(null), 8000)
    })

    // Pilot status changed → queue anlık güncelle
    const unsubStatusChanged = on(SOCKET_EVENTS.PILOT_STATUS_CHANGED, () => {
      fetchQueueList()
    })

    // Queue reorder veya toggle → anlık güncelle
    const unsubQueueUpdated = on(SOCKET_EVENTS.PILOT_QUEUE_UPDATED, () => {
      fetchQueueList()
    })

    // Queue'yu her 30sn yenile
    const queueInterval = setInterval(fetchQueueList, 30000)
    fetchQueueList()

    return () => {
      unsubAssigned()
      unsubPickup()
      unsubTakeoff()
      unsubLanded()
      unsubLimitWarning()
      unsubLimitReached()
      unsubStatusChanged()
      unsubQueueUpdated()
      clearInterval(queueInterval)
    }
  }, [user?.pilotId, on, fetchPanelData, fetchQueueList])

  const handleLogout = async () => {
    await cleanupFcmToken()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
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
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-white/10 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setShowProfileSidebar(true)}
          >
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-white text-primary text-lg">
                {user?.pilotName?.slice(0, 2).toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
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
          {/* Sıra butonu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { fetchQueueList(); setShowQueueModal(true) }}
            className="text-white hover:bg-white/20 relative"
          >
            <ListOrdered className="h-5 w-5" />
          </Button>
          {/* Mesaj/Bildirim butonu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowNotifications(true)
              // Modal açılınca tüm bildirimleri okundu yap
              setNotificationList(prev => prev.map(n => ({ ...n, read: true })))
            }}
            className="text-white hover:bg-white/20 relative"
          >
            <MessageSquare className="h-5 w-5" />
            {notificationList.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {notificationList.filter(n => !n.read).length > 99 ? '99+' : notificationList.filter(n => !n.read).length}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/20 ml-1"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* PWA Components */}
      <PushNotificationManager showOnMount={true} />
      <PWAInstallPrompt />

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
      <div className="p-4 grid grid-cols-4 gap-2">
        <Card
          className={`cursor-pointer active:scale-95 transition-transform ${pilot?.inQueue ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => { fetchQueueList(); setShowQueueModal(true) }}
        >
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {pilot?.inQueue && pilot.status === 'AVAILABLE' && pilot.queuePosition > 0 ? pilot.queuePosition : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Sıra</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${isAtLimit ? 'text-red-600' : 'text-primary'}`}>
              {pilot?.dailyFlightCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Bugün</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats?.remaining || 0}</p>
            <p className="text-xs text-muted-foreground">Kalan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats?.inQueue || 0}</p>
            <p className="text-xs text-muted-foreground">Bekleyen</p>
          </CardContent>
        </Card>
      </div>


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
                    <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                      <Scale className="h-4 w-4" />
                      <span>{customer.weight} kg</span>
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
                                Güvenli İniş
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
            {[...completedFlights].reverse().slice(0, 5).map((flight, index) => {
              const flightNumber = completedFlights.length - index
              return (
              <Card key={flight.id} className="bg-green-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">
                        {flight.customer.firstName} {flight.customer.lastName}
                        <span className="text-xs text-muted-foreground ml-1">· {flight.customer.weight} kg</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {flight.customer.displayId}
                        <span className="ml-2">
                          {new Date(flight.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-green-700">{flightNumber}.</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedQRCustomer(flight.customer)
                      setSelectedQRType('media')
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Müşteri QR Kodu
                  </Button>
                </CardContent>
              </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom Safe Area */}
      <div className="h-8" />

      {/* Profile Sidebar */}
      {showProfileSidebar && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowProfileSidebar(false)}
          />

          {/* Sidebar */}
          <div className="fixed top-0 left-0 bottom-0 w-80 bg-white shadow-xl z-50 flex flex-col animate-slide-in-left">
            {/* Header */}
            <div className="bg-primary text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-white text-primary text-lg">
                    {user?.pilotName?.slice(0, 2).toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{user?.pilotName || user?.username}</h2>
                  <p className="text-sm opacity-90">Pilot Panel</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProfileSidebar(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Status Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Durumunuz</h3>
                <div className="space-y-2">
                  {(['AVAILABLE', 'ON_BREAK', 'OFF_DUTY'] as const).map((status) => {
                    const cfg = statusConfig[status]
                    const Icon = cfg.icon
                    const isActive = pilot?.status === status
                    return (
                      <Button
                        key={status}
                        variant={isActive ? 'default' : 'outline'}
                        className={`w-full justify-start h-12 ${isActive ? cfg.color : ''}`}
                        onClick={() => {
                          handleStatusChange(status)
                          setShowProfileSidebar(false)
                        }}
                        disabled={updating === 'status' || isActive || pilot?.status === 'IN_FLIGHT'}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        <span>{cfg.label}</span>
                        {isActive && <CheckCircle className="h-4 w-4 ml-auto" />}
                      </Button>
                    )
                  })}
                </div>
                {pilot?.status === 'IN_FLIGHT' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Uçuştayken durum değiştiremezsiniz
                  </p>
                )}
              </div>

              {/* Stats Summary */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Günlük Özet</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tamamlanan Uçuş</span>
                    <span className="font-semibold">{pilot?.dailyFlightCount || 0}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Kalan Limit</span>
                    <span className="font-semibold">{stats?.remaining || 0}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Sıra Durumu</span>
                      {!pilot?.inQueue ? (
                        <span className="font-semibold text-orange-500">Sırada Değil</span>
                      ) : pilot?.status === 'ON_BREAK' ? (
                        <span className="font-semibold text-yellow-600">Molada</span>
                      ) : pilot?.status === 'OFF_DUTY' ? (
                        <span className="font-semibold text-gray-500">Mesai Dışı</span>
                      ) : pilot?.status === 'IN_FLIGHT' ? (
                        <span className="font-semibold text-blue-600">Uçuşta</span>
                      ) : pilot.queuePosition > 0 ? (
                        <span className="font-semibold text-yellow-600">{pilot.queuePosition}. sırada</span>
                      ) : (
                        <span className="font-semibold text-yellow-600">Sırada</span>
                      )}
                    </div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Bağlantı</h3>
                <div className="flex items-center gap-2 text-sm">
                  {isConnected ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">Bağlı</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 font-medium">Bağlantı Yok</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Notification Modal */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowNotifications(false)} />
          <div className="fixed inset-x-0 top-0 bottom-0 z-50 flex flex-col bg-white max-w-md mx-auto shadow-xl">
            {/* Safe area header */}
            <div className="bg-primary text-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <h2 className="font-semibold text-lg">Bugünkü Bildirimler</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notificationList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                  <MessageSquare className="h-12 w-12 opacity-20 mb-3" />
                  <p className="font-medium">Henüz bildirim yok</p>
                  <p className="text-sm mt-1">Yeni bildirimler burada görünür</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notificationList.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 p-4 transition-colors ${notif.read ? 'bg-white' : 'bg-blue-50'}`}
                      onMouseEnter={() => {
                        if (!notif.read) {
                          setNotificationList(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
                        }
                      }}
                      onTouchStart={() => {
                        if (!notif.read) {
                          setNotificationList(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
                        }
                      }}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${notif.read ? 'bg-gray-100' : 'bg-blue-100'}`}>
                        <MessageSquare className={`h-4 w-4 ${notif.read ? 'text-gray-400' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${notif.read ? 'text-gray-500 font-normal' : 'text-gray-800 font-medium'}`}>{notif.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {notificationList.length > 0 && (
              <div className="p-4 border-t" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <Button variant="outline" className="w-full" onClick={() => {
                  setNotificationList([])
                  try { localStorage.removeItem(`notifs_${user?.pilotId}`) } catch {}
                  setShowNotifications(false)
                }}>
                  Tümünü Temizle
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      {/* Queue Modal */}
      {showQueueModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowQueueModal(false)} />
          <div className="fixed inset-x-0 top-0 bottom-0 z-50 flex flex-col bg-white max-w-md mx-auto shadow-xl">
            {/* Safe area header */}
            <div className="bg-primary text-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5" />
                  <h2 className="font-semibold text-lg">Pilot Sırası</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowQueueModal(false)} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {(() => {
                const active = queueList.filter(p => p.inQueue && p.status === 'AVAILABLE')
                const onBreak = queueList.filter(p => p.inQueue && (p.status === 'ON_BREAK' || p.status === 'OFF_DUTY'))
                const inFlight = queueList.filter(p => p.inQueue && p.status === 'IN_FLIGHT')
                const sorted = [
                  ...active.sort((a, b) => a.queuePosition - b.queuePosition),
                  ...onBreak.sort((a, b) => a.queuePosition - b.queuePosition),
                  ...inFlight,
                ]
                if (sorted.length === 0) return (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                    <Users className="h-12 w-12 opacity-20 mb-3" />
                    <p className="font-medium">Sıra yükleniyor...</p>
                  </div>
                )
                return sorted.map((p, index) => {
                  const isMe = p.id === pilot?.id
                  const isInFlight = p.status === 'IN_FLIGHT'
                  const isAtLimit = p.dailyFlightCount >= p.maxDailyFlights
                  const statusLabel: Record<string, string> = {
                    AVAILABLE: 'Müsait', IN_FLIGHT: 'Uçuşta', ON_BREAK: 'Molada',
                    OFF_DUTY: 'Mesai Dışı', ASSIGNED: 'Atandı',
                  }
                  const statusColor: Record<string, string> = {
                    AVAILABLE: 'text-green-600 bg-green-50', IN_FLIGHT: 'text-blue-600 bg-blue-50',
                    ON_BREAK: 'text-yellow-600 bg-yellow-50', OFF_DUTY: 'text-gray-500 bg-gray-100',
                    ASSIGNED: 'text-purple-600 bg-purple-50',
                  }
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-yellow-50 border-l-4 border-yellow-400' : isInFlight ? 'bg-blue-50/40' : ''} ${isAtLimit ? 'opacity-50' : ''}`}>
                      <span className={`w-8 text-center font-bold text-lg ${isMe ? 'text-yellow-600' : isInFlight ? 'text-blue-400' : 'text-muted-foreground'}`}>
                        {isInFlight ? <Plane className="h-4 w-4 mx-auto" /> : index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isMe ? 'text-yellow-700' : ''}`}>
                          {p.name} {isMe && <span className="text-xs font-normal text-yellow-600">(Sen)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.dailyFlightCount}/{p.maxDailyFlights} uçuş</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[p.status] || 'text-gray-500 bg-gray-100'}`}>
                        {statusLabel[p.status] || p.status}
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </div>
        </>
      )}

      {/* QR Code Modal */}
      {selectedQRCustomer && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedQRCustomer(null)}
          >
            {/* Modal */}
            <div
              className="bg-white rounded-lg p-6 max-w-sm w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setSelectedQRCustomer(null)}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Customer Info */}
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  {selectedQRCustomer.displayId}
                </p>
                <h3 className="text-xl font-bold">
                  {selectedQRCustomer.firstName} {selectedQRCustomer.lastName}
                </h3>
                <p className="text-sm mt-1 font-medium text-primary">
                  Müşteri QR Kodu
                </p>
              </div>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    `${window.location.protocol}//${
                      window.location.hostname === 'skytrackyp.com' || window.location.hostname === 'www.skytrackyp.com'
                        ? 'skytrackyp.com'
                        : window.location.hostname.includes('trycloudflare.com')
                        ? window.location.hostname
                        : `${window.location.hostname}:${window.location.port}`
                    }/c/${selectedQRCustomer.displayId}`
                  )}`}
                  alt="QR Code"
                  className="w-full h-auto"
                />
              </div>

              {/* Instructions */}
              <p className="text-sm text-center text-muted-foreground mb-4">
                Müşteri / Foto Video QR
              </p>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.protocol}//${
                      window.location.hostname === 'skytrackyp.com' || window.location.hostname === 'www.skytrackyp.com'
                        ? 'skytrackyp.com'
                        : window.location.hostname.includes('trycloudflare.com')
                        ? window.location.hostname
                        : `${window.location.hostname}:${window.location.port}`
                    }/c/${selectedQRCustomer.displayId}`
                    navigator.clipboard.writeText(url)
                    setNotification('Link kopyalandı!')
                    setTimeout(() => setNotification(null), 2000)
                  }}
                >
                  Link Kopyala
                </Button>
                <Button
                  onClick={() => {
                    const url = `${window.location.protocol}//${
                      window.location.hostname === 'skytrackyp.com' || window.location.hostname === 'www.skytrackyp.com'
                        ? 'skytrackyp.com'
                        : window.location.hostname.includes('trycloudflare.com')
                        ? window.location.hostname
                        : `${window.location.hostname}:${window.location.port}`
                    }/c/${selectedQRCustomer.displayId}`
                    window.open(url, '_blank')
                  }}
                >
                  Sayfayı Aç
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
