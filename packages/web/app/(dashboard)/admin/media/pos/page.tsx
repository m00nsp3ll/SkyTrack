'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, mediaApi, currencyApi, productsApi, openNetworkFolder } from '@/lib/api'
// html5-qrcode imported dynamically below
import {
  Camera, Search, CreditCard, CheckCircle, Download,
  RefreshCw, QrCode, FolderOpen, User, X, Check,
  AlertTriangle, Copy, Truck, Star, ImageIcon,
  Plane, Clock, Package, ChevronRight, SwitchCamera,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Currency = 'EUR' | 'USD' | 'GBP' | 'RUB' | 'TRY'

interface PayEntry {
  id: string
  currency: Currency
  amount: number
  method: 'CASH' | 'CREDIT_CARD' | 'TRANSFER'
  eurEquivalent: number
}

interface Product {
  id: string
  name: string
  price: number
  category: string
}

interface CustomerMedia {
  customer: { id: string; displayId: string; name: string }
  flight: {
    id: string
    status: string
    pilotName: string
    sortiNumber: number | null
    assignedAt: string | null
    takeoffAt: string | null
    landingAt: string | null
    durationMinutes: number | null
  } | null
  mediaFolder: {
    id: string
    folderPath: string
    fileCount: number
    totalSizeBytes: number
    paymentStatus: 'PENDING' | 'PAID'
    deliveryStatus: 'PENDING' | 'READY' | 'DELIVERED'
  } | null
  hasPendingMediaSale: boolean
}

interface ActiveFlight {
  id: string
  status: string
  customer: { displayId: string; firstName: string; lastName: string }
  pilot: { name: string }
  takeoffAt: string | null
  mediaFolder?: { paymentStatus: string; fileCount: number } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES: { value: Currency; label: string; symbol: string; color: string; bg: string; border: string }[] = [
  { value: 'EUR', label: 'EUR', symbol: '€', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300' },
  { value: 'USD', label: 'USD', symbol: '$', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  { value: 'GBP', label: 'GBP', symbol: '£', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-300' },
  { value: 'RUB', label: 'RUB', symbol: '₽', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  { value: 'TRY', label: 'TRY', symbol: '₺', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
]

const PACKAGES = [
  { id: 'silver',   label: 'Silver',   price: 100, icon: '🥈', border: 'border-slate-300',  selectedBorder: 'border-slate-500 ring-2 ring-slate-200',   bg: 'bg-slate-50',   text: 'text-slate-700' },
  { id: 'gold',     label: 'Gold',     price: 120, icon: '🥇', border: 'border-yellow-300', selectedBorder: 'border-yellow-500 ring-2 ring-yellow-200',  bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  { id: 'platinum', label: 'Platinum', price: 150, icon: '💎', border: 'border-purple-300', selectedBorder: 'border-purple-500 ring-2 ring-purple-200',  bg: 'bg-purple-50',  text: 'text-purple-700' },
]

const flightStatusLabels: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  REGISTERED: { label: 'Kayıtlı',      color: 'text-gray-700',   bg: 'bg-gray-100',   dot: 'bg-gray-400' },
  ASSIGNED:   { label: 'Pilot Atandı', color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-500' },
  PICKED_UP:  { label: 'Alındı',       color: 'text-indigo-700', bg: 'bg-indigo-100', dot: 'bg-indigo-500' },
  IN_FLIGHT:  { label: 'Uçuşta',       color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500 animate-pulse' },
  COMPLETED:  { label: 'Tamamlandı',   color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500' },
  CANCELLED:  { label: 'İptal',        color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500' },
}

function getCustomerPageUrl(displayId: string) {
  if (typeof window === 'undefined') return `https://skytrackyp.com/c/${displayId}`
  const h = window.location.hostname
  if (h === 'skytrackyp.com' || h === 'www.skytrackyp.com') return `https://skytrackyp.com/c/${displayId}`
  if (h.includes('trycloudflare.com')) return `https://${h}/c/${displayId}`
  return `https://${h}:${window.location.port || '3000'}/c/${displayId}`
}

// ─── Component ────────────────────────────────────

export default function MediaPosPage() {
  const [searchId, setSearchId]           = useState('')
  const [loading, setLoading]             = useState(false)
  const [scanning, setScanning]           = useState(false)
  const [customerMedia, setCustomerMedia] = useState<CustomerMedia | null>(null)
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [openingFolder, setOpeningFolder] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [markingDelivered, setMarkingDelivered]   = useState(false)
  const [sentToCashier, setSentToCashier]         = useState(false)
  const [copied, setCopied]               = useState(false)
  const [showQrModal, setShowQrModal]     = useState(false)
  const [qrDataUrl, setQrDataUrl]         = useState<string | null>(null)
  const scannerRef = useRef<any>(null)

  // Header stats
  const [activeFlights, setActiveFlights] = useState<ActiveFlight[]>([])
  const [todayStats, setTodayStats]       = useState({ completed: 0, paid: 0, pending: 0, totalEUR: 0 })
  const [lastUpdate, setLastUpdate]       = useState('')

  // Products
  const [fvProducts, setFvProducts] = useState<Product[]>([])

  // Currency
  const [allRates, setAllRates] = useState<Record<string, { buyRate: number }>>({})
  // buyRate = units of currency per 1 EUR (EUR-based cross rate)
  // e.g. USD.buyRate ≈ 1.12 means 1 EUR = 1.12 USD
  const convertedEurToUsd = (eur: number) => {
    const usdRate = allRates['USD']?.buyRate || 0
    if (!usdRate) return 0
    return eur * usdRate
  }

  // Manuel para birimi seçimi
  const [manualCurrency, setManualCurrency] = useState<Currency>('EUR')

  // Payment
  const [selectedPkg, setSelectedPkg]       = useState<typeof PACKAGES[0] | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [mediaPrice, setMediaPrice]          = useState('25')
  const [payEntries, setPayEntries]          = useState<PayEntry[]>([])
  const [activeCurrency, setActiveCurrency]  = useState<Currency | null>(null)
  const [activeMethod, setActiveMethod]      = useState<'CASH' | 'CREDIT_CARD' | 'TRANSFER'>('CASH')
  const [activeAmount, setActiveAmount]      = useState('')
  const amountInputRef = useRef<HTMLInputElement>(null)

  // ── Helpers ──────────────────────────────────────

  const getCurrencySymbol = (c: string) => CURRENCIES.find(x => x.value === c)?.symbol || c
  const getMethodLabel    = (m: string) => m === 'CASH' ? 'Nakit' : m === 'CREDIT_CARD' ? 'Kart' : 'Havale'
  const getAvailableMethods = (c: Currency): ('CASH' | 'CREDIT_CARD' | 'TRANSFER')[] =>
    c === 'GBP' || c === 'RUB' ? ['CASH'] : ['CASH', 'CREDIT_CARD', 'TRANSFER']

  const convertToEUR   = (amt: number, from: Currency) => from === 'EUR' ? amt : amt / (allRates[from]?.buyRate || 1)
  const convertFromEUR = (amt: number, to: Currency)   => to   === 'EUR' ? amt : amt * (allRates[to]?.buyRate || 1)

  const manualAmountAsEUR = () => {
    const raw = parseFloat(mediaPrice) || 0
    return convertToEUR(raw, manualCurrency)
  }

  const totalEUR     = selectedPkg || selectedProduct
    ? parseFloat(mediaPrice) || 0
    : manualAmountAsEUR()
  const paidTotal    = payEntries.reduce((s, e) => s + e.eurEquivalent, 0)
  const remaining    = totalEUR - paidTotal
  const paymentValid = paidTotal > 0 && remaining <= 0.01

  const addEntry = () => {
    if (!activeCurrency) return
    const amt = parseFloat(activeAmount)
    if (!amt || amt <= 0) return
    setPayEntries(prev => [...prev, {
      id: String(Date.now()), currency: activeCurrency, amount: amt,
      method: activeMethod, eurEquivalent: convertToEUR(amt, activeCurrency),
    }])
    setActiveAmount('')
    setActiveCurrency(null)
  }

  const removeEntry = (id: string) => setPayEntries(prev => prev.filter(e => e.id !== id))

  const openCurrencyPay = (c: Currency) => {
    setActiveCurrency(c)
    setActiveMethod('CASH')
    if (remaining > 0.01) {
      setActiveAmount((Math.ceil(convertFromEUR(remaining, c) * 100) / 100).toFixed(2))
    } else {
      setActiveAmount('')
    }
    setTimeout(() => amountInputRef.current?.focus(), 50)
  }

  const selectPackage = (pkg: typeof PACKAGES[0]) => {
    setSelectedPkg(pkg)
    setSelectedProduct(null)
    setMediaPrice(String(pkg.price))
    setPayEntries([])
    setActiveCurrency(null)
  }

  const selectProduct = (prod: Product) => {
    setSelectedProduct(prod)
    setSelectedPkg(null)
    setMediaPrice(String(prod.price))
    setPayEntries([])
    setActiveCurrency(null)
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  // ── Fetch ──────────────────────────────────────────

  const fetchRates = useCallback(async () => {
    try {
      const res = await currencyApi.getRates()
      setAllRates(res.data?.data?.rates || {})
    } catch {}
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productsApi.getAll({ activeOnly: 'true', category: 'Foto/Video' })
      setFvProducts(res.data?.data?.products || [])
    } catch {}
  }, [])

  const fetchHeaderStats = useCallback(async () => {
    try {
      const [flightsRes, statsRes] = await Promise.all([
        api.get('/flights/live'),
        api.get('/media/stats/today'),
      ])
      const flights = flightsRes.data?.data?.flights || []
      setActiveFlights(flights.filter((f: ActiveFlight) =>
        ['IN_FLIGHT', 'ASSIGNED', 'PICKED_UP'].includes(f.status)
      ))
      const stats = statsRes.data?.data || {}
      setTodayStats({
        completed: stats.completedFlights || 0,
        paid:      stats.paidCount || 0,
        pending:   stats.pendingCount || 0,
        totalEUR:  stats.totalRevenueEUR || 0,
      })
      setLastUpdate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))
    } catch {}
  }, [])

  useEffect(() => {
    fetchRates()
    fetchProducts()
    fetchHeaderStats()
    const interval = setInterval(fetchHeaderStats, 30000)
    return () => clearInterval(interval)
  }, [fetchRates, fetchProducts, fetchHeaderStats])

  const refreshData = useCallback(async (id?: string) => {
    const cid = id || customerMedia?.customer.id
    if (!cid) return
    const infoRes = await mediaApi.getInfo(cid)
    setCustomerMedia(infoRes.data.data)
  }, [customerMedia?.customer.id])

  // Auto-load QR when payment is confirmed
  useEffect(() => {
    const paid = customerMedia?.mediaFolder?.paymentStatus === 'PAID'
    if (paid && customerMedia && !qrDataUrl) {
      api.get(`/customers/${customerMedia.customer.id}/qr?format=json`)
        .then(res => setQrDataUrl(res.data.data.qrCode))
        .catch(() => {})
    }
  }, [customerMedia?.mediaFolder?.paymentStatus, customerMedia?.customer.id, qrDataUrl])

  // ── QR Scanner ─────────────────────────────────────

  const [qrFacing, setQrFacing] = useState<'environment' | 'user'>('environment')

  const startQrScanner = async (facing?: 'environment' | 'user') => {
    if (scannerRef.current) return
    setShowQrScanner(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      scannerRef.current = new Html5Qrcode('qr-reader-pos')
      await scannerRef.current.start(
        { facingMode: facing || qrFacing },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text: string) => {
          const match = text.match(/\/c\/([A-Z]\d{4})/)
          const id = match ? match[1] : text
          setSearchId(id)
          handleSearch(id)
          stopQrScanner()
        },
        () => {}
      )
    } catch {
      setShowQrScanner(false)
    }
  }

  const stopQrScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
    }
    setShowQrScanner(false)
  }

  const toggleQrCamera = async () => {
    const newMode = qrFacing === 'environment' ? 'user' : 'environment'
    setQrFacing(newMode)
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
      await startQrScanner(newMode)
    }
  }

  useEffect(() => {
    return () => { if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current = null } }
  }, [])

  // ── Actions ────────────────────────────────────────

  const handleSearch = async (id?: string) => {
    const val = (id || searchId).trim()
    if (!val) return
    setLoading(true)
    setCustomerMedia(null)
    setPayEntries([])
    setActiveCurrency(null)
    setSelectedPkg(null)
    setSelectedProduct(null)
    setQrDataUrl(null)
    setSentToCashier(false)
    try {
      const infoRes = await mediaApi.getInfo(val)
      setCustomerMedia(infoRes.data.data)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Müşteri bulunamadı')
    } finally { setLoading(false) }
  }

  const handleScanFolder = async () => {
    if (!customerMedia) return
    setScanning(true)
    try {
      const res = await mediaApi.scanFolder(customerMedia.customer.id)
      alert(res.data.message)
      await refreshData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Klasör tarama hatası')
    } finally { setScanning(false) }
  }

  const handleOpenFolder = async () => {
    if (!customerMedia) return
    setOpeningFolder(true)
    try {
      const res = await api.post(`/media/${customerMedia.customer.id}/open-folder`)
      if (!res.data?.data) throw new Error('SMB path alınamadı')
      openNetworkFolder(res.data.data)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Klasör açılamadı')
    } finally {
      setOpeningFolder(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!customerMedia || !e.target.files?.length) return
    setUploadingFiles(true)
    const formData = new FormData()
    Array.from(e.target.files).forEach(file => formData.append('files', file))
    try {
      await api.post(`/media/upload/${customerMedia.customer.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await refreshData()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Yükleme başarısız')
    } finally {
      setUploadingFiles(false)
      e.target.value = ''
    }
  }

  const handleSendToCashier = async () => {
    if (!customerMedia || !totalEUR) return
    setProcessingPayment(true)
    try {
      const itemName = selectedPkg
        ? `Foto/Video Paketi (${selectedPkg.label})`
        : selectedProduct
        ? selectedProduct.name
        : 'Foto/Video Paketi'

      await api.post('/sales', {
        customerId: customerMedia.customer.id,
        items: [{ productId: null, itemType: 'Foto/Video', itemName, quantity: 1, unitPrice: totalEUR }],
        paymentStatus: 'UNPAID',
        primaryCurrency: 'EUR',
      })

      setPayEntries([])
      setActiveCurrency(null)
      setActiveAmount('')
      setSelectedPkg(null)
      setSelectedProduct(null)
      setSentToCashier(true)
      await refreshData()
      await fetchHeaderStats()
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error?.message || 'İşlem başarısız')
    } finally { setProcessingPayment(false) }
  }

  const handleMarkDelivered = async () => {
    if (!customerMedia) return
    setMarkingDelivered(true)
    try {
      await api.patch(`/media/${customerMedia.customer.id}/delivery`, { status: 'DELIVERED' })
      await refreshData()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'İşlem başarısız')
    } finally { setMarkingDelivered(false) }
  }

  const handleCopyLink = () => {
    if (!customerMedia) return
    navigator.clipboard.writeText(getCustomerPageUrl(customerMedia.customer.displayId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Derived ────────────────────────────────────────

  const mediaFolder           = customerMedia?.mediaFolder
  const isFlightCompleted     = customerMedia?.flight?.status === 'COMPLETED'
  const hasMedia              = (mediaFolder?.fileCount || 0) > 0
  const isPaid                = mediaFolder?.paymentStatus === 'PAID'
  const isDelivered           = mediaFolder?.deliveryStatus === 'DELIVERED'
  const isReady               = mediaFolder?.deliveryStatus === 'READY'
  const hasPendingMediaSale   = customerMedia?.hasPendingMediaSale ?? false
  const isSentToCashier       = sentToCashier || hasPendingMediaSale
  const flightStatus      = customerMedia?.flight
    ? (flightStatusLabels[customerMedia.flight.status] || flightStatusLabels.REGISTERED)
    : null

  // ─── Render ────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ══ ARAMA BAR ══ */}
      <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
            <Input
              placeholder="Müşteri ID gir (A0101) veya QR tara..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="pl-9 h-11 text-base border-blue-200 focus-visible:ring-blue-400"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 px-6 bg-blue-600 hover:bg-blue-700 font-semibold">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-2" />Ara</>}
          </Button>
          <Button type="button" variant="outline" className="h-11 px-4 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => showQrScanner ? stopQrScanner() : startQrScanner()}>
            <QrCode className="h-4 w-4 mr-2" />
            {showQrScanner ? 'Kapat' : 'QR Tara'}
          </Button>
        </form>
        {showQrScanner && (
          <div className="mt-4 flex flex-col items-center">
            <div id="qr-reader-pos" className="w-96 rounded-lg overflow-hidden" />
            <Button variant="outline" size="sm" className="mt-2" onClick={toggleQrCamera}>
              <SwitchCamera className="h-4 w-4 mr-1" />
              {qrFacing === 'environment' ? 'Ön Kamera' : 'Arka Kamera'}
            </Button>
          </div>
        )}
      </div>

      {/* ══ ANA ALAN ══ */}
      {!customerMedia ? (
        /* Boş ekran */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-8">
            <img
              src="/skytrack-logo.png"
              alt="SkyTrack"
              className="w-52 h-52 mx-auto rounded-3xl shadow-lg object-cover"
            />
            <div>
              <p className="text-lg text-muted-foreground">Müşteri QR kodunu okutun</p>
            </div>
            <button
              onClick={() => startQrScanner()}
              className="flex items-center gap-3 mx-auto px-10 py-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold text-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <QrCode className="h-8 w-8" />
              QR Tara
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid lg:grid-cols-[1fr_400px] gap-4 min-h-0">

          {/* ══ SOL — Müşteri Bilgisi + Medya ══ */}
          <div className="space-y-4 overflow-y-auto">

            {/* Müşteri Kartı */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Müşteri</p>
                    <p className="text-4xl font-bold text-primary tracking-wider">{customerMedia.customer.displayId}</p>
                    <p className="text-xl font-semibold mt-0.5">{customerMedia.customer.name}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isFlightCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {isFlightCompleted ? '✓ Uçuş Tamamlandı' : '⏳ Uçuş Devam Ediyor'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${hasMedia ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {hasMedia ? '✓ Foto/Video Yüklendi' : '⏳ Foto/Video Bekleniyor'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isPaid ? 'bg-green-100 text-green-700' : isSentToCashier ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                      {isPaid ? '✓ Ödeme Alındı' : isSentToCashier ? '⏳ Kasaya Yönlendirildi' : '— Ödeme Yok'}
                    </span>
                  </div>
                </div>

                {/* Pilot bilgisi */}
                {customerMedia.flight && (() => {
                  const flight = customerMedia.flight!
                  const flightDate = flight.assignedAt
                    ? new Date(flight.assignedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : null
                  const flightTime = flight.assignedAt
                    ? new Date(flight.assignedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : null
                  return (
                    <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{flight.pilotName}</p>
                        <p className="text-xs text-muted-foreground">
                          {flightDate && flightTime ? `${flightDate} ${flightTime}` : 'Pilot'}
                          {flight.sortiNumber ? ` · ${flight.sortiNumber}. sorti` : ''}
                        </p>
                      </div>
                      {flight.durationMinutes && (
                        <div className="text-right">
                          <p className="font-semibold">{flight.durationMinutes} dk</p>
                          <p className="text-xs text-muted-foreground">Süre</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Medya Durumu */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />Medya Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Butonlar ortada */}
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" variant="default" className="h-9 px-4 bg-orange-500 hover:bg-orange-600" onClick={handleOpenFolder} disabled={openingFolder}>
                    {openingFolder ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <FolderOpen className="h-6 w-6 mr-2" />}
                    Klasörü Aç
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 px-4" onClick={handleScanFolder} disabled={scanning}>
                    {scanning ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Tara
                  </Button>
                  <label>
                    <Button size="sm" variant="default" className="h-9 px-4 bg-blue-600 hover:bg-blue-700" disabled={uploadingFiles} asChild>
                      <span>
                        {uploadingFiles ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                        Webden Yükle
                      </span>
                    </Button>
                    <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                {!isFlightCompleted && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg text-orange-700 text-sm">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span>⚠️ Pilot uçuşu henüz kapatmamış — pilota bilgi verin</span>
                  </div>
                )}
                {!hasMedia ? (
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Medya henüz yüklenmedi</p>
                      {mediaFolder?.folderPath && (
                        <p className="text-xs font-mono mt-0.5 opacity-70">{mediaFolder.folderPath}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-3xl font-bold">{mediaFolder?.fileCount || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Dosya</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xl font-bold">{formatBytes(mediaFolder?.totalSizeBytes || 0)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Boyut</p>
                    </div>
                    <div className={`text-center p-3 rounded-xl ${isPaid ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <p className={`font-bold ${isPaid ? 'text-green-700' : 'text-yellow-700'}`}>
                        {isPaid ? '✓' : '⏳'}
                      </p>
                      <p className={`text-xs mt-1 ${isPaid ? 'text-green-700' : 'text-yellow-700'}`}>
                        {isPaid ? 'Ödendi' : 'Bekliyor'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ödeme alındıysa — link + QR */}
            {isPaid && (
              <Card className="border-green-400 border-2">
                <CardHeader className="pb-2 bg-green-50 rounded-t-lg">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    Müşteri İndirme Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-xs break-all">
                      {getCustomerPageUrl(customerMedia.customer.displayId)}
                    </code>
                    <Button size="sm" variant="outline" onClick={handleCopyLink}>
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    <div>
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR" className="w-20 h-20 border rounded-lg cursor-pointer" onClick={() => setShowQrModal(true)} />
                      ) : (
                        <div className="w-20 h-20 border rounded-lg flex items-center justify-center bg-gray-50">
                          <QrCode className="h-7 w-7 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="h-9" onClick={() => setShowQrModal(true)} disabled={!qrDataUrl}>
                        <QrCode className="h-3.5 w-3.5 mr-1.5" />QR Büyüt
                      </Button>
                      <a href={mediaApi.getDownloadUrl(customerMedia.customer.displayId)} target="_blank" rel="noopener noreferrer" className="contents">
                        <Button variant="outline" size="sm" className="h-9">
                          <Download className="h-3.5 w-3.5 mr-1.5" />ZIP İndir
                        </Button>
                      </a>
                      {!isDelivered ? (
                        <Button size="sm" variant="outline" className="h-9 col-span-2" onClick={handleMarkDelivered} disabled={markingDelivered}>
                          {markingDelivered ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Truck className="h-3.5 w-3.5 mr-1.5" />}
                          Teslim Edildi İşaretle
                        </Button>
                      ) : (
                        <div className="col-span-2 flex items-center justify-center gap-1.5 text-green-600 text-sm">
                          <Check className="h-4 w-4" /> Müşteriye Teslim Edildi
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ══ SAĞ — Ödeme Paneli ══ */}
          <div className="space-y-3 overflow-y-auto">

            {isPaid ? (
              <Card className="border-green-400">
                <CardContent className="py-6 text-center space-y-3">
                  <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
                  <p className="text-xl font-bold text-green-700">Ödeme Alındı</p>
                  <div className="text-left space-y-2 mt-2">
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">Ödeme bekleniyor</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-green-800 font-medium">Ödeme yapıldı</span>
                    </div>
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${hasMedia ? 'bg-green-50' : 'bg-gray-50'}`}>
                      {hasMedia ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <Download className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                      <span className={hasMedia ? 'text-green-800 font-medium' : 'text-gray-400'}>İndirmeye hazır</span>
                    </div>
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${isDelivered ? 'bg-green-50' : 'bg-gray-50'}`}>
                      {isDelivered ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <Download className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                      <span className={isDelivered ? 'text-green-800 font-medium' : 'text-gray-400'}>İndirildi</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : isSentToCashier ? (
              <Card className="border-orange-400 border-2">
                <CardContent className="py-6 text-center space-y-3">
                  <div className="inline-block bg-orange-100 rounded-full p-3">
                    <CreditCard className="h-10 w-10 text-orange-500" />
                  </div>
                  <p className="text-xl font-bold text-orange-700">Kasaya Yönlendirildi</p>
                  <div className="text-left space-y-2 mt-1">
                    <div className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-lg text-sm">
                      <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      </div>
                      <span className="text-orange-700 font-medium">Ödeme bekleniyor</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-sm">
                      <Download className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      <span className="text-gray-400">Ödeme yapıldı</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-sm">
                      <Download className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      <span className="text-gray-400">İndirmeye hazır</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-sm">
                      <Download className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      <span className="text-gray-400">İndirildi</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Paketler */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />PAKETLER
                  </p>
                  <div className="space-y-2">
                    {PACKAGES.map(pkg => (
                      <button
                        key={pkg.id}
                        onClick={() => selectPackage(pkg)}
                        className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
                          selectedPkg?.id === pkg.id ? `${pkg.selectedBorder} ${pkg.bg}` : `${pkg.border} bg-white hover:bg-gray-50`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{pkg.icon}</span>
                            <span className={`font-bold text-sm ${selectedPkg?.id === pkg.id ? pkg.text : 'text-gray-800'}`}>
                              {pkg.label} Paket
                            </span>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${selectedPkg?.id === pkg.id ? pkg.text : 'text-gray-700'}`}>€{pkg.price}</p>
                            {convertedEurToUsd(pkg.price) > 0 && <p className="text-xs text-muted-foreground">${convertedEurToUsd(pkg.price).toFixed(0)}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Foto/Video Ürünleri */}
                {fvProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />ÜRÜNLER
                    </p>
                    <div className="space-y-1.5">
                      {fvProducts.map(prod => (
                        <button
                          key={prod.id}
                          onClick={() => selectProduct(prod)}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                            selectedProduct?.id === prod.id
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <span className={`font-medium text-sm ${selectedProduct?.id === prod.id ? 'text-primary' : 'text-gray-800'}`}>
                            {prod.name}
                          </span>
                          <div className="text-right">
                            <p className={`font-bold ${selectedProduct?.id === prod.id ? 'text-primary' : 'text-gray-700'}`}>€{prod.price}</p>
                            {convertedEurToUsd(prod.price) > 0 && <p className="text-xs text-muted-foreground">${convertedEurToUsd(prod.price).toFixed(0)}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manuel Tutar */}
                <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Manuel:</span>
                  <div className="flex gap-1.5">
                    {CURRENCIES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => { setManualCurrency(c.value); setSelectedPkg(null); setSelectedProduct(null); setPayEntries([]) }}
                        className={`flex-1 py-2 rounded text-sm font-bold border-2 transition-all ${
                          manualCurrency === c.value && !selectedPkg && !selectedProduct
                            ? `${c.bg} ${c.border} ${c.color} ring-2 ring-offset-1`
                            : `${c.bg} ${c.border} ${c.color} opacity-40 hover:opacity-70`
                        }`}
                      >
                        {c.symbol}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg w-5">
                      {CURRENCIES.find(c => c.value === manualCurrency)?.symbol}
                    </span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={mediaPrice}
                      onChange={(e) => { setMediaPrice(e.target.value); setSelectedPkg(null); setSelectedProduct(null); setPayEntries([]) }}
                      className="flex-1 h-9 text-base font-bold"
                    />
                    {totalEUR > 0 && manualCurrency !== 'EUR' && (
                      <span className="text-sm text-muted-foreground">≈ €{totalEUR.toFixed(2)}</span>
                    )}
                    {totalEUR > 0 && convertedEurToUsd(totalEUR) > 0 && manualCurrency !== 'USD' && (
                      <span className="text-sm text-green-600">${convertedEurToUsd(totalEUR).toFixed(0)}</span>
                    )}
                  </div>
                </div>

                {/* Kasaya Yönlendir bölümü */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />Kasaya Yönlendir
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!isFlightCompleted && (
                      <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-orange-700 text-xs">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>Pilot uçuşu henüz kapatmamış — pilota bilgi verin</span>
                      </div>
                    )}
                    {/* Tutar özeti */}
                    {totalEUR > 0 && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                        <div className="flex justify-between font-semibold text-blue-800">
                          <span>Toplam Tutar</span>
                          <span>€{totalEUR.toFixed(2)}{convertedEurToUsd(totalEUR) > 0 ? ` / $${convertedEurToUsd(totalEUR).toFixed(0)}` : ''}</span>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-xs flex-wrap">
                          {CURRENCIES.filter(c => c.value !== 'EUR').map(c => {
                            const eq = convertFromEUR(totalEUR, c.value)
                            return eq > 0 ? <span key={c.value} className={c.color}>{getCurrencySymbol(c.value)}{eq.toFixed(2)}</span> : null
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
                      onClick={handleSendToCashier}
                      disabled={processingPayment || !totalEUR}
                    >
                      {processingPayment
                        ? <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                        : <CreditCard className="h-5 w-5 mr-2" />}
                      Kasaya Yönlendir — €{totalEUR.toFixed(2)}
                      {convertedEurToUsd(totalEUR) > 0 && totalEUR > 0 && ` / $${convertedEurToUsd(totalEUR).toFixed(0)}`}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && qrDataUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowQrModal(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <p className="text-center font-bold mb-1">{customerMedia?.customer.displayId}</p>
            <p className="text-center text-xs text-muted-foreground mb-4">Müşteri İndirme QR Kodu</p>
            <img src={qrDataUrl} alt="QR" className="w-full rounded-lg border" />
            <p className="text-center text-xs text-muted-foreground mt-3">
              Müşteri bu kodu tarayarak fotoğraflarını indirebilir
            </p>
            <Button className="w-full mt-4" variant="outline" onClick={() => setShowQrModal(false)}>Kapat</Button>
          </div>
        </div>
      )}
    </div>
  )
}
