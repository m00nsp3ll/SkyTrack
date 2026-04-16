'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { pilotsApi, flightsApi, mediaApi, fcmApi, swapApi } from '@/lib/api'
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
  ChevronDown,
  History,
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
  status: 'AVAILABLE' | 'IN_FLIGHT' | 'ON_BREAK' | 'OFF_DUTY' | 'UNAVAILABLE' | 'ASSIGNED' | 'PICKED_UP'
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
  UNAVAILABLE: { label: 'Müsait Değil', color: 'bg-orange-500', icon: Moon },
  ASSIGNED: { label: 'Müşteri Atandı', color: 'bg-purple-500', icon: CheckCircle },
  PICKED_UP: { label: 'Müşteri Alındı', color: 'bg-blue-400', icon: CheckCircle },
} as const

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
  const [showFlightHistory, setShowFlightHistory] = useState(false)
  const [flightHistory, setFlightHistory] = useState<any[]>([])
  const [flightHistoryPeriod, setFlightHistoryPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [flightHistoryFrom, setFlightHistoryFrom] = useState('')
  const [flightHistoryTo, setFlightHistoryTo] = useState('')
  const [flightHistoryCount, setFlightHistoryCount] = useState<number | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  // Cancel modal state
  const [cancelModal, setCancelModal] = useState<{ flightId: string; customerName: string } | null>(null)
  const [cancelReason, setCancelReason] = useState<'WEATHER' | 'CUSTOMER_CANCEL' | 'OTHER'>('WEATHER')
  const [cancelNote, setCancelNote] = useState('')
  const [cancelling, setCancelling] = useState(false)
  // Forfeit modal
  const [forfeitModal, setForfeitModal] = useState(false)
  const [forfeiting, setForfeiting] = useState(false)
  // Pilot Swap modals
  const [swapModal, setSwapModal] = useState<{ flightId: string; customerName: string } | null>(null)
  const [swappablePilots, setSwappablePilots] = useState<any[]>([])
  const [swapRequesting, setSwapRequesting] = useState(false)
  const [pendingSwap, setPendingSwap] = useState<any | null>(null)
  const [swapTimeLeft, setSwapTimeLeft] = useState(0)

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

  const fetchFlightHistory = useCallback(async (period: 'today' | 'week' | 'month' | 'custom', from?: string, to?: string) => {
    if (!user?.pilotId) return
    setLoadingHistory(true)
    try {
      let fromDate = ''
      let toDate = ''
      const today = new Date()
      if (period === 'today') {
        fromDate = today.toISOString().slice(0, 10)
        toDate = fromDate
      } else if (period === 'week') {
        const start = new Date(today)
        const day = today.getDay()
        start.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
        fromDate = start.toISOString().slice(0, 10)
        toDate = today.toISOString().slice(0, 10)
      } else if (period === 'month') {
        fromDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
        toDate = today.toISOString().slice(0, 10)
      } else if (period === 'custom') {
        fromDate = from || ''
        toDate = to || from || ''
      }
      const response = await pilotsApi.getByIdWithDates(user.pilotId, fromDate, toDate)
      const flights = response.data.data.filteredFlights || []
      setFlightHistory(flights)
      setFlightHistoryCount(flights.length)
    } catch {
      setFlightHistory([])
      setFlightHistoryCount(0)
    } finally {
      setLoadingHistory(false)
    }
  }, [user?.pilotId])

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
            read: n.isRead ?? false,
          }))
          setNotificationList(apiNotifs)
          // App badge
          const unread = apiNotifs.filter((n: any) => !n.read).length
          if ('setAppBadge' in navigator) (navigator as any).setAppBadge(unread || 0).catch(() => {})
        }
      })
      .catch(() => {})

    // Initialize native push notifications (Capacitor/FCM)
    initNativePush(token || undefined).catch(console.error)

    // Fallback polling every 20 seconds (Socket.IO handles real-time updates)
    const interval = setInterval(() => {
      fetchPanelData(parsed.pilotId)
    }, 20000)

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
      // Panel datasını da güncelle (swap sonrası müşteri değişmiş olabilir)
      if (user?.pilotId) fetchPanelData(user.pilotId)
    })

    // Pilot Swap tamamlandı (onaylandı) → anlık güncelle
    const unsubSwapCompleted = on('pilot:swap-completed' as any, () => {
      if (user?.pilotId) fetchPanelData(user.pilotId)
      setPendingSwap(null)
      setSwapModal(null)
    })

    // Pilot Swap talebi geldi → modal'ı hemen aç
    const unsubSwapRequested = on('pilot:swap-requested' as any, () => {
      fetchPendingSwap()
      // Sesli/titreşimli uyarı
      try {
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
      } catch {}
    })

    // Queue'yu her 30sn yenile
    const queueInterval = setInterval(fetchQueueList, 60000)
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
      unsubSwapCompleted()
      unsubSwapRequested()
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

  const handleCancelFlight = async () => {
    if (!cancelModal) return
    setCancelling(true)
    try {
      await flightsApi.cancel(cancelModal.flightId, cancelReason, cancelReason === 'OTHER' ? cancelNote : undefined)
      setCancelModal(null)
      setCancelReason('WEATHER')
      setCancelNote('')
      if (user) await fetchPanelData(user.pilotId)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'İptal başarısız')
    } finally {
      setCancelling(false)
    }
  }

  const handleForfeit = async () => {
    setForfeiting(true)
    try {
      await pilotsApi.forfeitMe()
      setForfeitModal(false)
      if (user) await fetchPanelData(user.pilotId)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Feragat başarısız')
    } finally {
      setForfeiting(false)
    }
  }

  // Pilot Swap — modal aç ve swap yapılabilir pilotları getir
  const openSwapModal = async (flightId: string, customerName: string) => {
    setSwapModal({ flightId, customerName })
    try {
      const res = await swapApi.getSwappable()
      setSwappablePilots(res.data.data || [])
    } catch (err: any) {
      setError('Pilot listesi alınamadı')
    }
  }

  const requestSwap = async (targetPilotId: string) => {
    setSwapRequesting(true)
    try {
      await swapApi.create(targetPilotId)
      setSwapModal(null)
      alert('Değişim talebi gönderildi. Hedef pilotun onayını bekleyin (60 saniye).')
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Talep gönderilemedi')
    } finally {
      setSwapRequesting(false)
    }
  }

  const approveSwap = async () => {
    if (!pendingSwap) return
    try {
      await swapApi.approve(pendingSwap.id)
      setPendingSwap(null)
      if (user) await fetchPanelData(user.pilotId)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Onaylanamadı')
    }
  }

  const declineSwap = async () => {
    if (!pendingSwap) return
    try {
      await swapApi.decline(pendingSwap.id)
      setPendingSwap(null)
    } catch {}
  }

  // Bekleyen swap taleplerini polle (FCM/socket gelmese bile yakalasın)
  const fetchPendingSwap = useCallback(async () => {
    try {
      const res = await swapApi.getPending()
      if (res.data.data) {
        setPendingSwap(res.data.data)
      } else {
        setPendingSwap((prev: any) => (prev ? null : prev))
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!user?.pilotId) return
    fetchPendingSwap()
    const interval = setInterval(fetchPendingSwap, 15000) // 15sn polling (socket.io fallback)
    return () => clearInterval(interval)
  }, [user?.pilotId, fetchPendingSwap])

  // Countdown timer
  useEffect(() => {
    if (!pendingSwap) return
    const calc = () => {
      const left = Math.max(0, Math.floor((new Date(pendingSwap.expiresAt).getTime() - Date.now()) / 1000))
      setSwapTimeLeft(left)
      if (left === 0) setPendingSwap(null)
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [pendingSwap])

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
              // Modal açılınca tüm bildirimleri okundu yap (DB + state)
              setNotificationList(prev => prev.map(n => ({ ...n, read: true })))
              if (user?.pilotId) {
                fcmApi.markAllRead(user.pilotId).catch(() => {})
                if ('setAppBadge' in navigator) (navigator as any).clearAppBadge().catch(() => {})
              }
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
              {pilot?.inQueue && pilot.status === 'AVAILABLE' && pilot.queuePosition > 0
                ? pilot.queuePosition
                : '-'}
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
                          <>
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
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="lg"
                                variant="outline"
                                className="h-12 text-sm border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => openSwapModal(flight.id, `${customer.firstName} ${customer.lastName}`)}
                              >
                                🔄 Pilot Değiştir
                              </Button>
                              <Button
                                size="lg"
                                variant="outline"
                                className="h-12 text-sm border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => setCancelModal({ flightId: flight.id, customerName: `${customer.firstName} ${customer.lastName}` })}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Uçuş İptal
                              </Button>
                            </div>
                          </>
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
            <div className="bg-primary text-white p-3 flex items-center justify-between" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback className="bg-white text-primary text-sm">
                    {user?.pilotName?.slice(0, 2).toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm truncate leading-tight">{user?.pilotName || user?.username}</h2>
                  <p className="text-xs opacity-75">Pilot Panel</p>
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

                {/* Feragat Butonu */}
                {(pilot?.status === 'AVAILABLE' || pilot?.status === 'UNAVAILABLE' || pilot?.status === 'ON_BREAK') && (
                  <Button
                    variant="outline"
                    className="w-full mt-3 border-orange-300 text-orange-700 hover:bg-orange-50 h-11"
                    onClick={() => {
                      setForfeitModal(true)
                      setShowProfileSidebar(false)
                    }}
                  >
                    ⏭️ Feragat Et
                  </Button>
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
                        <span className="font-semibold text-yellow-600">
                          {pilot.queuePosition}. sırada
                        </span>
                      ) : (
                        <span className="font-semibold text-yellow-600">Sırada</span>
                      )}
                    </div>
                </div>
              </div>

              {/* Toplam Uçuş Sayısı */}
              <div className="mb-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Toplam Uçuş Sayısı</span>
                  <span className="font-semibold text-primary">
                    {flightHistoryCount !== null ? flightHistoryCount : pilot?.dailyFlightCount || 0}
                  </span>
                </div>
                <button
                  className="mt-2 w-full text-left text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700 py-1"
                  onClick={() => {
                    setFlightHistoryPeriod('today')
                    fetchFlightHistory('today')
                    setShowFlightHistory(true)
                    setShowProfileSidebar(false)
                  }}
                >
                  <History className="h-3.5 w-3.5" />
                  Geçmiş Uçuşlarım
                </button>
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
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${notif.read ? 'bg-gray-100' : 'bg-blue-100'}`}>
                        <MessageSquare className={`h-4 w-4 ${notif.read ? 'text-gray-400' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notif.read ? 'text-gray-500 font-normal' : 'text-gray-800 font-medium'}`}>{notif.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {notif.read && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Okundu
                          </p>
                        )}
                      </div>
                      {!notif.read ? (
                        <button
                          onClick={() => {
                            setNotificationList(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
                            fcmApi.markRead(notif.id).catch(() => {})
                          }}
                          className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95 transition-all font-medium"
                        >
                          Okundu
                        </button>
                      ) : (
                        <div className="w-2 h-2 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {notificationList.length > 0 && (
              <div className="p-4 border-t flex gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <Button variant="outline" className="flex-1" onClick={() => {
                  setNotificationList(prev => prev.map(n => ({ ...n, read: true })))
                  if (user?.pilotId) fcmApi.markAllRead(user.pilotId).catch(() => {})
                  if ('setAppBadge' in navigator) (navigator as any).clearAppBadge().catch(() => {})
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Tümünü Okundu
                </Button>
                <Button variant="ghost" className="flex-1 text-red-500 hover:text-red-600" onClick={() => {
                  setNotificationList([])
                  try { localStorage.removeItem(`notifs_${user?.pilotId}`) } catch {}
                  setShowNotifications(false)
                }}>
                  Temizle
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
                const inQueue = queueList.filter(p => p.inQueue)
                const isAvailableSlot = (p: any) => p.status === 'AVAILABLE' && p.dailyFlightCount < p.maxDailyFlights
                const active = inQueue.filter(isAvailableSlot).sort((a, b) => a.queuePosition - b.queuePosition)
                const inactive = inQueue.filter(p => !isAvailableSlot(p)).sort((a, b) => a.queuePosition - b.queuePosition)

                if (active.length === 0 && inactive.length === 0) return (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                    <Users className="h-12 w-12 opacity-20 mb-3" />
                    <p className="font-medium">Sıra yükleniyor...</p>
                  </div>
                )

                const statusLabel: Record<string, string> = {
                  AVAILABLE: 'Müsait', IN_FLIGHT: 'Uçuşta', ON_BREAK: 'Molada',
                  OFF_DUTY: 'Mesai Dışı', ASSIGNED: 'Müşteri Atandı', PICKED_UP: 'Müşteri Alındı',
                }
                const statusColor: Record<string, string> = {
                  AVAILABLE: 'text-green-600 bg-green-50', IN_FLIGHT: 'text-blue-600 bg-blue-50',
                  ON_BREAK: 'text-yellow-600 bg-yellow-50', OFF_DUTY: 'text-gray-500 bg-gray-100',
                  ASSIGNED: 'text-purple-600 bg-purple-50', PICKED_UP: 'text-blue-500 bg-blue-50',
                }

                return (
                  <>
                    {active.map((p, index) => {
                      const isMe = p.id === pilot?.id
                      return (
                        <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}>
                          <span className={`w-8 text-center font-bold text-lg ${isMe ? 'text-yellow-600' : 'text-muted-foreground'}`}>{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${isMe ? 'text-yellow-700' : ''}`}>
                              {p.name} {isMe && <span className="text-xs font-normal text-yellow-600">(Sen)</span>}
                            </p>
                            {isMe && <p className="text-xs text-muted-foreground">{p.dailyFlightCount}/{p.maxDailyFlights} uçuş</p>}
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor.AVAILABLE}`}>Müsait</span>
                        </div>
                      )
                    })}
                    {inactive.length > 0 && (
                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-t-2 border-gray-200">
                        Müsait Olmayanlar ({inactive.length})
                      </div>
                    )}
                    {inactive.map((p) => {
                      const isMe = p.id === pilot?.id
                      const isInFlight = p.status === 'IN_FLIGHT'
                      return (
                        <div key={p.id} className={`flex items-center gap-3 px-4 py-3 opacity-70 ${isMe ? 'bg-yellow-50 border-l-4 border-yellow-400' : isInFlight ? 'bg-blue-50/40' : ''}`}>
                          <span className="w-8 text-center text-gray-400">—</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${isMe ? 'text-yellow-700' : ''}`}>
                              {p.name} {isMe && <span className="text-xs font-normal text-yellow-600">(Sen)</span>}
                            </p>
                            {isMe && <p className="text-xs text-muted-foreground">{p.dailyFlightCount}/{p.maxDailyFlights} uçuş</p>}
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[p.status] || 'text-gray-500 bg-gray-100'}`}>
                            {statusLabel[p.status] || p.status}
                          </span>
                        </div>
                      )
                    })}
                  </>
                )
              })()}
            </div>
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </div>
        </>
      )}

      {/* Flight History Modal */}
      {showFlightHistory && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowFlightHistory(false)} />
          <div className="fixed inset-x-0 top-0 bottom-0 z-50 flex flex-col bg-white max-w-md mx-auto shadow-xl">
            <div className="bg-primary text-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  <h2 className="font-semibold text-lg">Geçmiş Uçuşlarım</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowFlightHistory(false)} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {/* Period Tabs */}
              <div className="flex gap-1 px-4 pb-3">
                {(['today', 'week', 'month', 'custom'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setFlightHistoryPeriod(p)
                      if (p !== 'custom') fetchFlightHistory(p)
                    }}
                    className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                      flightHistoryPeriod === p ? 'bg-white text-primary' : 'text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {p === 'today' ? 'Bugün' : p === 'week' ? 'Bu Hafta' : p === 'month' ? 'Bu Ay' : 'Özel'}
                  </button>
                ))}
              </div>
              {/* Custom date picker */}
              {flightHistoryPeriod === 'custom' && (
                <div className="flex items-center gap-2 px-4 pb-3">
                  <input
                    type="date"
                    value={flightHistoryFrom}
                    onChange={e => setFlightHistoryFrom(e.target.value)}
                    className="flex-1 text-xs px-2 py-1.5 rounded bg-white/20 text-white placeholder-white/50 border border-white/30"
                  />
                  <span className="text-white/60 text-xs">–</span>
                  <input
                    type="date"
                    value={flightHistoryTo}
                    onChange={e => setFlightHistoryTo(e.target.value)}
                    className="flex-1 text-xs px-2 py-1.5 rounded bg-white/20 text-white placeholder-white/50 border border-white/30"
                  />
                  <button
                    onClick={() => fetchFlightHistory('custom', flightHistoryFrom, flightHistoryTo)}
                    disabled={!flightHistoryFrom}
                    className="text-xs px-3 py-1.5 bg-white text-primary rounded font-medium disabled:opacity-50"
                  >
                    Ara
                  </button>
                </div>
              )}
            </div>
            {/* Count summary */}
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Toplam uçuş</span>
              <span className="text-lg font-bold text-primary">
                {loadingHistory ? '...' : flightHistoryCount ?? flightHistory.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : flightHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                  <Plane className="h-12 w-12 opacity-20 mb-3" />
                  <p className="font-medium">Uçuş kaydı bulunamadı</p>
                </div>
              ) : (
                flightHistory.map((f: any, i: number) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground">{flightHistory.length - i}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {f.customer?.firstName} {f.customer?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{f.customer?.displayId}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{new Date(f.createdAt).toLocaleDateString('tr-TR')}</p>
                      <p>{new Date(f.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : f.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {f.status === 'COMPLETED' ? 'Tamam' : f.status === 'CANCELLED' ? 'İptal' : 'Aktif'}
                    </span>
                  </div>
                ))
              )}
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

      {/* Pilot Swap - Hedef Pilot Seç Modal */}
      {swapModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto p-6 max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold mb-1 text-purple-700">🔄 Pilot Değiştir</h2>
            <p className="text-sm text-muted-foreground mb-1">Mevcut müşteri: <strong>{swapModal.customerName}</strong></p>
            <p className="text-xs text-muted-foreground mb-4">Aşağıdaki pilotlardan biriyle müşterileri değiştirebilirsiniz.</p>
            {swappablePilots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Şu an değişim yapılabilecek pilot yok</p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {swappablePilots.map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => requestSwap(f.pilot.id)}
                    disabled={swapRequesting}
                    className="w-full text-left p-3 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all disabled:opacity-50"
                  >
                    <div className="font-bold">{f.pilot.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Yolcu: <strong>{f.customer.firstName} {f.customer.lastName}</strong> ({f.customer.displayId})
                    </div>
                    {f.customer.weight && (
                      <div className="text-xs text-blue-600 mt-0.5">⚖️ {f.customer.weight} kg</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={() => setSwapModal(null)}>Vazgeç</Button>
          </div>
        </div>
      )}

      {/* Pilot Swap - Hedef Pilot Onay Modal (gelen istek için) */}
      {pendingSwap && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto p-6">
            <h2 className="text-xl font-bold mb-3 text-purple-700">🔄 Değişim Talebi</h2>

            {/* Sizin Yolcunuz */}
            {pendingSwap.targetCustomer && (
              <div className="bg-blue-50 rounded-xl p-3 mb-2">
                <p className="text-xs text-blue-600 font-medium mb-1">SİZİN YOLCUNUZ</p>
                <p className="font-bold">{pendingSwap.targetCustomer.firstName} {pendingSwap.targetCustomer.lastName}</p>
                <p className="text-sm text-muted-foreground">
                  {pendingSwap.targetCustomer.displayId}
                  {pendingSwap.targetCustomer.weight && ` · ⚖️ ${pendingSwap.targetCustomer.weight} kg`}
                </p>
              </div>
            )}

            <p className="text-center text-purple-600 text-2xl my-1">⇅</p>

            {/* İsteyen pilotun yolcusu */}
            {pendingSwap.requesterCustomer && (
              <div className="bg-orange-50 rounded-xl p-3 mb-3">
                <p className="text-xs text-orange-600 font-medium mb-1">{pendingSwap.requester?.name?.toUpperCase() || 'PİLOT'}'İN YOLCUSU</p>
                <p className="font-bold">{pendingSwap.requesterCustomer.firstName} {pendingSwap.requesterCustomer.lastName}</p>
                <p className="text-sm text-muted-foreground">
                  {pendingSwap.requesterCustomer.displayId}
                  {pendingSwap.requesterCustomer.weight && ` · ⚖️ ${pendingSwap.requesterCustomer.weight} kg`}
                </p>
              </div>
            )}

            <p className="text-center text-sm text-gray-700 mb-3">değiştirmek istiyor</p>

            <div className="text-center bg-purple-50 rounded-xl p-2 mb-4">
              <p className="text-3xl font-bold text-purple-700">{swapTimeLeft}</p>
              <p className="text-xs text-muted-foreground">saniye sonra otomatik iptal</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-14 text-base border-red-300 text-red-700" onClick={declineSwap}>
                ❌ Reddet
              </Button>
              <Button className="flex-1 h-14 text-base bg-green-600 hover:bg-green-700" onClick={approveSwap}>
                ✅ Onayla
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Flight Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1 text-red-700">Uçuş İptal</h2>
            <p className="text-sm text-muted-foreground mb-4">{cancelModal.customerName}</p>

            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium">İptal Nedeni:</p>
              {[
                { value: 'WEATHER', label: '🌧️ Kötü Hava', desc: 'Sıranız korunur' },
                { value: 'CUSTOMER_CANCEL', label: '👤 Müşteri İptal Etti', desc: 'Sıranız korunur' },
                { value: 'OTHER', label: '⚠️ Diğer', desc: '1 tur sonrasına atılır (feragat)' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCancelReason(opt.value as any)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    cancelReason === opt.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>

            {cancelReason === 'OTHER' && (
              <div className="mb-4">
                <label className="text-sm font-medium">Açıklama (opsiyonel)</label>
                <textarea
                  value={cancelNote}
                  onChange={e => setCancelNote(e.target.value)}
                  placeholder="Neden iptal ettiğinizi yazın..."
                  className="w-full mt-1 p-2 border rounded-lg text-sm"
                  rows={2}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelModal(null)} disabled={cancelling}>
                Vazgeç
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleCancelFlight}
                disabled={cancelling}
              >
                {cancelling ? 'İptal Ediliyor...' : 'Uçuşu İptal Et'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Forfeit Modal */}
      {forfeitModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto p-6">
            <h2 className="text-xl font-bold mb-1 text-orange-700">⏭️ Feragat Et</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sıranızı feragat etmek istediğinize emin misiniz? <strong>1 tam tur sonrasına</strong> atılırsınız ve sıraya tekrar dahil olana kadar müşteri almazsınız.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setForfeitModal(false)} disabled={forfeiting}>
                Vazgeç
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={handleForfeit}
                disabled={forfeiting}
              >
                {forfeiting ? 'İşleniyor...' : 'Evet, Feragat Et'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
