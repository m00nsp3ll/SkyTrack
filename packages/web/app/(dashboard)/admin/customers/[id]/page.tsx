'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { io, Socket } from 'socket.io-client'
import {
  ArrowLeft,
  Printer,
  User,
  Phone,
  Mail,
  Scale,
  Plane,
  Camera,
  ShoppingCart,
  RefreshCw,
  QrCode,
  FolderOpen,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  CreditCard,
  Banknote,
  Building,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  XCircle,
  FileText,
  Minus,
  Trash2,
  Star,
  Search,
} from 'lucide-react'
import { productsApi, salesApi } from '@/lib/api'

// Types
interface Customer {
  id: string
  displayId: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  emergencyContact: string | null
  weight: number | null
  qrCode: string
  waiverSigned: boolean
  waiverSignedAt: string | null
  status: string
  createdAt: string
  assignedPilot: {
    id: string
    name: string
    phone: string
  } | null
  flights: Flight[]
  mediaFolders: MediaFolder[]
  sales: Sale[]
}

interface Flight {
  id: string
  status: string
  assignedAt: string
  pickupAt: string | null
  takeoffAt: string | null
  landingAt: string | null
  durationMinutes: number | null
  pilot: { id: string; name: string; phone?: string }
  mediaFolder: MediaFolder | null
}

interface MediaFolder {
  id: string
  folderPath: string
  fileCount: number
  totalSizeBytes?: number
  paymentStatus: string
  deliveryStatus: string
  paidAmount?: number
  paidAt?: string
  paymentMethod?: string
}

interface Sale {
  id: string
  itemName: string
  quantity: number
  totalPrice: number
  paymentStatus: string
  paymentMethod?: string
  createdAt: string
}

interface MediaFile {
  filename: string
  url: string
  thumbnailUrl?: string
  type: 'photo' | 'video'
  size: number
}

// Status configurations
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  REGISTERED: { label: 'Kayıtlı', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  ASSIGNED: { label: 'Pilot Atandı', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  IN_FLIGHT: { label: 'Uçuşta', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  COMPLETED: { label: 'Tamamlandı', color: 'text-green-700', bgColor: 'bg-green-100' },
  CANCELLED: { label: 'İptal', color: 'text-red-700', bgColor: 'bg-red-100' },
}

const flightSteps = [
  { key: 'REGISTERED', label: 'Kayıt', field: 'createdAt' },
  { key: 'ASSIGNED', label: 'Pilot Atandı', field: 'assignedAt' },
  { key: 'PICKED_UP', label: 'Müşteri Alındı', field: 'pickupAt' },
  { key: 'IN_FLIGHT', label: 'Uçuşta', field: 'takeoffAt' },
  { key: 'COMPLETED', label: 'Tamamlandı', field: 'landingAt' },
]

// Get customer page URL dynamically
function getCustomerPageUrl(displayId: string) {
  if (typeof window === 'undefined') return `https://skytrackyp.com/c/${displayId}`
  const hostname = window.location.hostname
  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return `https://skytrackyp.com/c/${displayId}`
  }
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname}/c/${displayId}`
  }
  return `https://${hostname}:${window.location.port || '3000'}/c/${displayId}`
}

// Get API URL dynamically
function getApiBaseUrl() {
  if (typeof window === 'undefined') return 'https://api.skytrackyp.com/api'
  const hostname = window.location.hostname
  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://api.skytrackyp.com/api'
  }
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname.replace(/^[^.]+/, 'api')}/api`
  }
  return `https://${hostname}:3001/api`
}

export default function CustomerDetailPage() {
  const params = useParams()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false)

  // Action states
  const [reassigning, setReassigning] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [openingFolder, setOpeningFolder] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [markingDelivered, setMarkingDelivered] = useState(false)
  const [showPilotConfirm, setShowPilotConfirm] = useState(false)
  const [nextPilot, setNextPilot] = useState<{ id: string; name: string } | null>(null)

  // Media state
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [mediaPrice, setMediaPrice] = useState('500')
  const [paymentMethod, setPaymentMethod] = useState<string>('')

  // POS Modal state
  const [showPosModal, setShowPosModal] = useState(false)
  const [posProducts, setPosProducts] = useState<any[]>([])
  const [posFavorites, setPosFavorites] = useState<any[]>([])
  const [posCart, setPosCart] = useState<any[]>([])
  const [posActiveCategory, setPosActiveCategory] = useState('Favori')
  const [posProductSearch, setPosProductSearch] = useState('')
  const [posLoading, setPosLoading] = useState(false)
  const [posProcessing, setPosProcessing] = useState(false)

  // Debt collection modal state
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [collectingDebt, setCollectingDebt] = useState(false)

  // Timers
  const [waitingTime, setWaitingTime] = useState<string>('')
  const [flightTime, setFlightTime] = useState<string>('')

  // Socket
  const [socket, setSocket] = useState<Socket | null>(null)

  // Fetch customer data
  const fetchCustomer = useCallback(async () => {
    try {
      const response = await api.get(`/customers/${params.id}`)
      setCustomer(response.data.data)
    } catch (error) {
      console.error('Failed to fetch customer:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  // Fetch media files
  const fetchMediaFiles = useCallback(async () => {
    if (!customer) return
    try {
      const response = await api.get(`/media/${customer.id}/files`)
      setMediaFiles(response.data.data?.files || [])
    } catch (error) {
      console.error('Failed to fetch media files:', error)
    }
  }, [customer])

  // Initial load
  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  // Load QR and media when customer loads
  useEffect(() => {
    if (customer) {
      if (customer.qrCode) {
        setQrCodeData(customer.qrCode)
      } else {
        api.get(`/customers/${customer.id}/qr?format=json`)
          .then(res => setQrCodeData(res.data.data.qrCode))
          .catch(() => {})
      }

      if (customer.flights?.[0]?.mediaFolder?.fileCount > 0) {
        fetchMediaFiles()
      }
    }
  }, [customer, fetchMediaFiles])

  // Socket.IO connection
  useEffect(() => {
    const socketUrl = typeof window !== 'undefined'
      ? (window.location.hostname === 'skytrackyp.com' || window.location.hostname === 'www.skytrackyp.com'
          ? 'https://api.skytrackyp.com'
          : `https://${window.location.hostname}:3001`)
      : 'https://localhost:3001'
    const newSocket = io(socketUrl)
    setSocket(newSocket)

    newSocket.on('customer:updated', (data: { customerId: string }) => {
      if (data.customerId === customer?.id) {
        fetchCustomer()
      }
    })

    newSocket.on('flight:updated', () => {
      fetchCustomer()
    })

    return () => {
      newSocket.disconnect()
    }
  }, [customer?.id, fetchCustomer])

  // Timer for waiting/flight time
  useEffect(() => {
    if (!customer) return

    const interval = setInterval(() => {
      const flight = customer.flights[0]

      // Waiting time (from registration to now, if not in flight yet)
      if (customer.status === 'REGISTERED' || customer.status === 'ASSIGNED') {
        const start = new Date(customer.createdAt).getTime()
        const now = Date.now()
        const diff = Math.floor((now - start) / 1000 / 60)
        setWaitingTime(`${diff} dakika`)
      }

      // Flight time (if in flight)
      if (flight?.status === 'IN_FLIGHT' && flight.takeoffAt) {
        const start = new Date(flight.takeoffAt).getTime()
        const now = Date.now()
        const diff = Math.floor((now - start) / 1000 / 60)
        setFlightTime(`${diff} dakika`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [customer])

  // Handlers
  const handlePrint = () => {
    if (!customer || !qrCodeData) return
    const now = new Date()
    const dateStr = now.toLocaleDateString('tr-TR')
    const timeStr = now.toLocaleTimeString('tr-TR')
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Kod - ${customer.displayId}</title>
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            @media print {
              html, body {
                margin: 0;
                padding: 0;
              }
            }
            body { font-family: Arial, sans-serif; text-align: center; padding: 10px; margin: 0; }
            .qr-container { width: 5cm; margin: 0 auto; padding: 10px; border: 1px dashed #ccc; }
            .qr-code { width: 4cm; height: 4cm; }
            .display-id { font-size: 14px; font-weight: bold; margin-top: 5px; }
            .customer-name { font-size: 12px; color: #666; }
            .datetime { font-size: 10px; color: #888; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrCodeData}" alt="QR Code" class="qr-code" />
            <div class="display-id">${customer.displayId}</div>
            <div class="customer-name">${customer.firstName} ${customer.lastName}</div>
            <div class="datetime">${dateStr} - ${timeStr}</div>
          </div>
          <script>window.onload = () => { setTimeout(() => window.print(), 200); };</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handlePrintWaiver = () => {
    if (!customer) return
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const now = new Date(customer.waiverSignedAt || new Date())
      const dateStr = now.toLocaleDateString('tr-TR')
      const timeStr = now.toLocaleTimeString('tr-TR')

      const waiverText = `YAMAC PARASUTU UCUSU RISK VE SORUMLULUK BEYANI

Bu belgeyi imzalayarak asagidaki hususlari kabul ve beyan ederim:

1. Yamac parasutu sporu, dogasi geregi tehlikeli bir aktivitedir ve ciddi yaralanma veya olum riski tasimaktadir.

2. Ucus sirasinda hava kosullari, ekipman arizasi veya diger ongorulemeyen durumlar nedeniyle kaza meydana gelebilecegini biliyorum.

3. Herhangi bir saglik problemim (kalp hastaligi, epilepsi, hamilelik, vb.) bulunmamaktadir veya varsa pilot ve yetkilere bildirdim.

4. Ucus oncesi verilen tum guvenlik talimatlarina uyacagimi taahhut ederim.

5. Meydana gelebilecek herhangi bir kaza, yaralanma veya maddi hasar durumunda kooperatif ve pilotu sorumlu tutmayacagimi kabul ederim.

6. 18 yasindan buyuk oldugumu veya yasal veli/vasi onayi aldigimi beyan ederim.`

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Risk Formu - ${customer.displayId}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            @media print {
              html, body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
              font-size: 12px;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 18px;
              margin: 0 0 5px 0;
            }
            .header h2 {
              font-size: 14px;
              margin: 0;
              font-weight: normal;
            }
            .info-box {
              border: 1px solid #ccc;
              padding: 10px;
              margin-bottom: 15px;
              background: #f9f9f9;
            }
            .info-box p {
              margin: 3px 0;
            }
            .waiver-text {
              white-space: pre-line;
              text-align: justify;
              margin-bottom: 20px;
            }
            .signature-section {
              margin-top: 30px;
            }
            .signature-section h3 {
              font-size: 12px;
              margin-bottom: 10px;
              text-decoration: underline;
            }
            .signature-name {
              font-weight: bold;
              margin-bottom: 10px;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              width: 200px;
              height: 60px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ALANYA PARAGLIDING</h1>
            <h2>RISK VE SORUMLULUK BEYANI</h2>
          </div>

          <div class="info-box">
            <p><strong>Musteri No:</strong> ${customer.displayId}</p>
            <p><strong>Ad Soyad:</strong> ${customer.firstName} ${customer.lastName}</p>
            <p><strong>Telefon:</strong> ${customer.phone}</p>
            <p><strong>Tarih:</strong> ${dateStr}</p>
            <p><strong>Saat:</strong> ${timeStr}</p>
          </div>

          <div class="waiver-text">${waiverText}</div>

          <div class="signature-section">
            <h3>IMZA</h3>
            <p>Yukaridaki beyani okudum, anladim ve kabul ediyorum.</p>
            <p class="signature-name">${customer.firstName} ${customer.lastName}</p>
            <div class="signature-line"></div>
          </div>

          <script>window.onload = () => window.print();</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleDownloadWaiverPdf = () => {
    if (!customer) return
    const apiUrl = getApiBaseUrl()
    window.open(`${apiUrl}/customers/${customer.id}/waiver-pdf`)
  }

  const handleCopyLink = async () => {
    const link = getCustomerPageUrl(customer?.displayId || '')
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenFolder = async () => {
    if (!customer) return
    setOpeningFolder(true)
    try {
      await api.post(`/media/${customer.id}/open-folder`)
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Klasör açılamadı')
    } finally {
      setOpeningFolder(false)
    }
  }

  const handleScanFolder = async () => {
    if (!customer) return
    setScanning(true)
    try {
      await api.post(`/media/${customer.id}/scan`)
      await fetchCustomer()
      await fetchMediaFiles()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Tarama başarısız')
    } finally {
      setScanning(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!customer || !e.target.files?.length) return
    setUploadingFiles(true)

    const formData = new FormData()
    Array.from(e.target.files).forEach(file => {
      formData.append('files', file)
    })

    try {
      await api.post(`/media/upload/${customer.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await fetchCustomer()
      await fetchMediaFiles()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Yükleme başarısız')
    } finally {
      setUploadingFiles(false)
    }
  }

  const handlePayment = async () => {
    if (!customer || !paymentMethod) return
    setProcessingPayment(true)
    try {
      // 1. Update media folder payment status
      await api.patch(`/media/${customer.id}/payment`, {
        status: 'PAID',
        amount: parseFloat(mediaPrice),
        paymentMethod
      })

      // 2. Create a sale record for media payment
      await salesApi.create({
        customerId: customer.id,
        items: [{
          productId: null,
          itemType: 'MEDIA',
          itemName: 'Fotoğraf/Video Paketi',
          quantity: 1,
          unitPrice: parseFloat(mediaPrice),
        }],
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod === 'CARD' ? 'CREDIT_CARD' : paymentMethod,
      })

      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Ödeme başarısız')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleMarkDelivered = async () => {
    if (!customer) return
    setMarkingDelivered(true)
    try {
      await api.patch(`/media/${customer.id}/delivery`, { status: 'DELIVERED' })
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'İşlem başarısız')
    } finally {
      setMarkingDelivered(false)
    }
  }

  const handleReassignPilot = async () => {
    if (!customer) return

    // First, get the next available pilot from queue
    setReassigning(true)
    try {
      const response = await api.get('/pilots/queue')
      const pilot = response.data.data?.nextPilot
      if (pilot) {
        setNextPilot({ id: pilot.id, name: pilot.name })
        setShowPilotConfirm(true)
      } else {
        alert('Şu an müsait pilot bulunmuyor')
      }
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Pilot bilgisi alınamadı')
    } finally {
      setReassigning(false)
    }
  }

  const confirmReassignPilot = async () => {
    if (!customer || !nextPilot) return
    setReassigning(true)
    setShowPilotConfirm(false)
    try {
      await api.post(`/customers/${customer.id}/reassign-pilot`, { pilotId: nextPilot.id })
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Pilot atanamadı')
    } finally {
      setReassigning(false)
      setNextPilot(null)
    }
  }

  const handleCancel = async () => {
    if (!customer || !confirm('Müşteriyi iptal etmek istediğinize emin misiniz?')) return
    try {
      await api.put(`/customers/${customer.id}`, { status: 'CANCELLED' })
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'İptal başarısız')
    }
  }

  const handleCollectAllDebt = async (paymentMethod: 'CASH' | 'CREDIT_CARD' | 'TRANSFER') => {
    if (!customer || unpaidSales.length === 0) return
    setCollectingDebt(true)
    try {
      // Use bulk pay endpoint
      await salesApi.bulkPay(customer.id, paymentMethod)
      setShowDebtModal(false)
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Tahsilat başarısız')
    } finally {
      setCollectingDebt(false)
    }
  }

  const handlePaySingleSale = async (saleId: string, paymentMethod: 'CASH' | 'CREDIT_CARD') => {
    try {
      await salesApi.updatePayment(saleId, 'PAID', paymentMethod)
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Ödeme başarısız')
    }
  }

  // POS Modal functions
  const openPosModal = async () => {
    setShowPosModal(true)
    setPosLoading(true)
    try {
      const [productsRes, favoritesRes] = await Promise.all([
        productsApi.getAll({ activeOnly: 'true' }),
        productsApi.getFavorites(),
      ])
      setPosProducts(productsRes.data.data.products || [])
      setPosFavorites(favoritesRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setPosLoading(false)
    }
  }

  const closePosModal = () => {
    setShowPosModal(false)
    setPosCart([])
    setPosProductSearch('')
    setPosActiveCategory('Favori')
  }

  const addToPosCart = (product: any) => {
    if (product.stock !== null && product.stock <= 0) {
      alert('Bu ürün tükendi')
      return
    }
    setPosCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          category: product.category,
          unitPrice: product.price,
          quantity: 1,
        },
      ]
    })
  }

  const updatePosQuantity = (productId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromPosCart = (productId: string) => {
    setPosCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const posCartTotal = posCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  const handlePosPayment = async (paymentMethod: 'CASH' | 'CREDIT_CARD' | 'TRANSFER', paymentStatus: 'PAID' | 'UNPAID' = 'PAID') => {
    if (posCart.length === 0 || !customer) return

    setPosProcessing(true)
    try {
      const items = posCart.map((item) => ({
        productId: item.productId,
        itemType: item.category,
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))

      await salesApi.create({
        customerId: customer.id,
        items,
        paymentStatus,
        paymentMethod: paymentStatus === 'PAID' ? paymentMethod : undefined,
      })

      closePosModal()
      await fetchCustomer() // Refresh sales list
    } catch (error: any) {
      alert(error.response?.data?.message || 'Satış kaydedilemedi')
    } finally {
      setPosProcessing(false)
    }
  }

  const getPosDisplayProducts = () => {
    let list: any[] = []
    if (posActiveCategory === 'Favori') {
      list = posFavorites
    } else {
      list = posProducts.filter((p) => p.category === posActiveCategory)
    }
    if (posProductSearch) {
      const searchLower = posProductSearch.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(searchLower))
    }
    return list
  }

  const POS_CATEGORIES = ['Favori', 'İçecek', 'Yiyecek', 'Hediyelik', 'Diğer']

  // Computed values
  const flight = customer?.flights[0]
  const mediaFolder = flight?.mediaFolder || customer?.mediaFolders[0]
  const status = customer ? statusConfig[customer.status] || statusConfig.REGISTERED : null

  const isFlightCompleted = customer?.status === 'COMPLETED'
  const hasMedia = mediaFolder && mediaFolder.fileCount > 0
  const isPaid = mediaFolder?.paymentStatus === 'PAID'
  const isDelivered = mediaFolder?.deliveryStatus === 'DELIVERED'

  // Sort sales: unpaid first
  const sortedSales = customer?.sales ? [...customer.sales].sort((a, b) => {
    if (a.paymentStatus !== 'PAID' && b.paymentStatus === 'PAID') return -1
    if (a.paymentStatus === 'PAID' && b.paymentStatus !== 'PAID') return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  }) : []

  const unpaidSales = customer?.sales.filter(s => s.paymentStatus !== 'PAID') || []
  const totalSpent = customer?.sales.reduce((sum, s) => sum + s.totalPrice, 0) || 0
  const totalPaid = customer?.sales.filter(s => s.paymentStatus === 'PAID').reduce((sum, s) => sum + s.totalPrice, 0) || 0
  const totalOwed = totalSpent - totalPaid

  // Get current flight step
  const getCurrentStep = () => {
    if (!customer || !flight) return 0
    if (customer.status === 'COMPLETED') return 4
    if (flight.status === 'IN_FLIGHT') return 3
    if (flight.status === 'PICKED_UP') return 2
    if (customer.status === 'ASSIGNED') return 1
    return 0
  }

  // Warnings
  const getWarnings = () => {
    const warnings: { type: 'error' | 'warning' | 'success'; message: string }[] = []

    if (!customer) return warnings

    // Flight duration warning
    if (flight?.status === 'IN_FLIGHT' && flight.takeoffAt) {
      const mins = Math.floor((Date.now() - new Date(flight.takeoffAt).getTime()) / 1000 / 60)
      if (mins > 30) {
        warnings.push({ type: 'error', message: `Uçuş ${mins} dakikadan uzun sürüyor!` })
      }
    }

    // Media not uploaded warning
    if (isFlightCompleted && !hasMedia && flight?.landingAt) {
      const hours = Math.floor((Date.now() - new Date(flight.landingAt).getTime()) / 1000 / 60 / 60)
      if (hours >= 2) {
        warnings.push({ type: 'error', message: `Medya yüklenmedi! Uçuş ${hours} saat önce tamamlandı` })
      }
    }

    // Payment pending
    if (hasMedia && !isPaid) {
      warnings.push({ type: 'warning', message: `Ödeme bekliyor — ${mediaPrice}₺` })
    }

    // POS debt
    if (totalOwed > 0) {
      warnings.push({ type: 'warning', message: `Ödenmemiş POS borcu: ${totalOwed}₺` })
    }

    // All complete
    if (isFlightCompleted && hasMedia && isPaid && totalOwed === 0) {
      warnings.push({ type: 'success', message: 'Tüm işlemler tamamlandı' })
    }

    return warnings
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Müşteri bulunamadı</p>
        <Link href="/admin/customers">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Listeye Dön
          </Button>
        </Link>
      </div>
    )
  }

  const warnings = getWarnings()
  const currentStep = getCurrentStep()

  return (
    <div className="space-y-4 pb-8">
      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                warning.type === 'error' ? 'bg-red-100 text-red-800' :
                warning.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}
            >
              {warning.type === 'error' ? <AlertTriangle className="w-5 h-5" /> :
               warning.type === 'warning' ? <Clock className="w-5 h-5" /> :
               <CheckCircle className="w-5 h-5" />}
              <span className="font-medium">{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>

          {/* QR Thumbnail */}
          <div
            className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => setShowQrModal(true)}
          >
            {qrCodeData ? (
              <img src={qrCodeData} alt="QR" className="w-14 h-14" />
            ) : (
              <QrCode className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {customer.firstName} {customer.lastName}
              </h1>
              <span className="text-xl text-muted-foreground">—</span>
              <span className="text-2xl font-mono font-bold text-primary">{customer.displayId}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${status?.bgColor} ${status?.color}`}>
                {status?.label}
              </span>
              <span className="text-sm text-muted-foreground">
                Kayıt: {new Date(customer.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            QR Yazdır
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrintWaiver}>
            <FileText className="w-4 h-4 mr-1" />
            Risk Formu Yazdır
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadWaiverPdf}>
            <Download className="w-4 h-4 mr-1" />
            PDF İndir
          </Button>
          <label>
            <Button size="sm" variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-1" />
                Medya Yükle
              </span>
            </Button>
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
          </label>
          {(customer.status === 'REGISTERED' || customer.status === 'ASSIGNED') && (
            <>
              <Button size="sm" variant="outline" onClick={handleReassignPilot} disabled={reassigning}>
                <RefreshCw className={`w-4 h-4 mr-1 ${reassigning ? 'animate-spin' : ''}`} />
                Pilot Değiştir
              </Button>
              <Button size="sm" variant="destructive" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                İptal Et
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Flight Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Uçuş Durumu
            {waitingTime && !isFlightCompleted && customer.status !== 'IN_FLIGHT' && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                Bekleme: {waitingTime}
              </span>
            )}
            {flightTime && customer.status === 'IN_FLIGHT' && (
              <span className="ml-auto text-sm font-normal text-orange-600">
                Uçuş süresi: {flightTime}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pilot Info */}
          {customer.assignedPilot && (
            <div className="flex items-center gap-4 mb-6 p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="font-semibold">{customer.assignedPilot.name}</p>
                <p className="text-sm text-muted-foreground">{customer.assignedPilot.phone}</p>
              </div>
            </div>
          )}

          {/* Timeline Stepper */}
          <div className="flex items-center justify-between">
            {flightSteps.map((step, i) => {
              const isCompleted = i <= currentStep
              const isCurrent = i === currentStep
              const stepTime = i === 0 ? customer.createdAt :
                              i === 1 ? flight?.assignedAt :
                              i === 2 ? flight?.pickupAt :
                              i === 3 ? flight?.takeoffAt :
                              flight?.landingAt

              return (
                <div key={step.key} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <Check className="w-5 h-5" /> : i + 1}
                    </div>
                    <p className={`mt-2 text-xs font-medium ${isCurrent ? 'text-blue-600' : ''}`}>
                      {step.label}
                    </p>
                    {stepTime && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(stepTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  {i < flightSteps.length - 1 && (
                    <div className={`absolute top-5 left-1/2 w-full h-0.5 ${
                      i < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Flight Duration */}
          {flight?.durationMinutes && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Uçuş süresi: <span className="font-semibold">{flight.durationMinutes} dakika</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Section */}
      <Card className={
        !isFlightCompleted ? 'border-gray-300' :
        !hasMedia ? 'border-red-500 border-2' :
        !isPaid ? 'border-yellow-500 border-2' :
        'border-green-500 border-2'
      }>
        <CardHeader className={
          !isFlightCompleted ? 'bg-gray-50' :
          !hasMedia ? 'bg-red-50' :
          !isPaid ? 'bg-yellow-50' :
          'bg-green-50'
        }>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Medya Durumu
            {!isFlightCompleted && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                Uçuş tamamlandığında medya yüklenebilir
              </span>
            )}
            {isFlightCompleted && !hasMedia && (
              <span className="ml-auto text-sm font-normal text-red-600">
                MEDYA YÜKLENMEDİ
              </span>
            )}
            {hasMedia && !isPaid && (
              <span className="ml-auto text-sm font-normal text-yellow-600">
                ÖDEME BEKLENİYOR
              </span>
            )}
            {isPaid && (
              <span className="ml-auto text-sm font-normal text-green-600">
                TAMAMLANDI
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {/* State A: Flight not completed */}
          {!isFlightCompleted && (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Uçuş tamamlandığında medya yüklenebilir</p>
            </div>
          )}

          {/* State B: Flight completed, no media */}
          {isFlightCompleted && !hasMedia && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <p className="text-lg font-semibold text-red-600">Klasör boş — Fotoğraf ve video henüz aktarılmadı</p>
                {mediaFolder?.folderPath && (
                  <p className="text-sm text-muted-foreground mt-2 font-mono bg-gray-100 inline-block px-2 py-1 rounded">
                    {mediaFolder.folderPath}
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <label>
                  <Button variant="default" disabled={uploadingFiles} asChild>
                    <span>
                      {uploadingFiles ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Web'den Yükle
                    </span>
                  </Button>
                  <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                </label>
                <Button variant="outline" onClick={handleOpenFolder} disabled={openingFolder}>
                  {openingFolder ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FolderOpen className="w-4 h-4 mr-2" />}
                  Klasörü Aç
                </Button>
                <Button variant="outline" onClick={handleScanFolder} disabled={scanning}>
                  {scanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Manuel Yüklendi (Klasörü Tara)
                </Button>
              </div>
            </div>
          )}

          {/* State C: Media uploaded, not paid */}
          {hasMedia && !isPaid && (
            <div className="space-y-6">
              {/* File info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {mediaFiles.filter(f => f.type === 'photo').length} Fotoğraf, {mediaFiles.filter(f => f.type === 'video').length} Video
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(mediaFolder?.totalSizeBytes || 0)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleOpenFolder}>
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Klasörü Aç
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleScanFolder} disabled={scanning}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${scanning ? 'animate-spin' : ''}`} />
                    Yenile
                  </Button>
                </div>
              </div>

              {/* Thumbnail preview */}
              {mediaFiles.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mediaFiles.slice(0, 5).map((file, i) => (
                    <div key={i} className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                      {file.thumbnailUrl ? (
                        <img src={file.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {mediaFiles.length > 5 && (
                    <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                      <span className="text-sm font-medium">+{mediaFiles.length - 5}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment section */}
              <div className="border-t pt-4">
                <p className="font-semibold mb-3">Ödeme Al</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Tutar:</span>
                    <Input
                      type="number"
                      value={mediaPrice}
                      onChange={(e) => setMediaPrice(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm">₺</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('CASH')}
                    >
                      <Banknote className="w-4 h-4 mr-1" />
                      Nakit
                    </Button>
                    <Button
                      variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('CARD')}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Kart
                    </Button>
                    <Button
                      variant={paymentMethod === 'TRANSFER' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('TRANSFER')}
                    >
                      <Building className="w-4 h-4 mr-1" />
                      Havale
                    </Button>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!paymentMethod || processingPayment}
                    onClick={handlePayment}
                  >
                    {processingPayment ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Ödeme Al
                  </Button>
                </div>
              </div>

              {/* Download link (disabled) */}
              <div className="bg-gray-100 p-3 rounded-lg text-center text-muted-foreground">
                <Download className="w-5 h-5 inline mr-2" />
                Müşteri İndirme Linki — Ödeme sonrası aktif olacak
              </div>
            </div>
          )}

          {/* State D: Paid */}
          {isPaid && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-semibold">
                      {mediaFiles.filter(f => f.type === 'photo').length} Fotoğraf, {mediaFiles.filter(f => f.type === 'video').length} Video
                    </p>
                    <p className="text-sm text-green-600">
                      {mediaFolder?.paidAmount || mediaPrice}₺ Ödendi
                      {mediaFolder?.paymentMethod && ` (${mediaFolder.paymentMethod === 'CASH' ? 'Nakit' : mediaFolder.paymentMethod === 'CARD' ? 'Kart' : 'Havale'})`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleOpenFolder} disabled={openingFolder}>
                  {openingFolder ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <FolderOpen className="w-4 h-4 mr-1" />}
                  Klasörü Göster
                </Button>
              </div>

              {/* Download Link & QR */}
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-semibold mb-2">Müşteri İndirme Linki</p>
                <div className="flex items-center gap-3">
                  <code className="bg-white px-3 py-2 rounded flex-1 text-sm">
                    {typeof window !== 'undefined' ? getCustomerPageUrl(customer.displayId) : `https://skytrackyp.com/c/${customer.displayId}`}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowQrModal(true)}>
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>

                {!isDelivered ? (
                  <Button
                    className="mt-3 w-full"
                    variant="outline"
                    onClick={handleMarkDelivered}
                    disabled={markingDelivered}
                  >
                    {markingDelivered ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Teslim Edildi Olarak İşaretle
                  </Button>
                ) : (
                  <div className="mt-3 text-center text-green-600 font-medium">
                    <Check className="w-4 h-4 inline mr-1" />
                    Müşteri dosyalarını indirdi
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Satış Geçmişi
              {unpaidSales.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                  {unpaidSales.length} ödenmemiş
                </span>
              )}
            </div>
            <Button size="sm" onClick={openPosModal}>
              <Plus className="w-4 h-4 mr-1" />
              Satış Ekle
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.sales.length > 0 ? (
            <>
              <div className="divide-y">
                {sortedSales.map((sale) => (
                  <div
                    key={sale.id}
                    className={`flex items-center justify-between py-3 ${
                      sale.paymentStatus !== 'PAID' ? 'bg-red-50 -mx-4 px-4' : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium">{sale.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.quantity} adet × {new Date(sale.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₺{sale.totalPrice.toLocaleString('tr-TR')}</p>
                      {sale.paymentStatus === 'PAID' ? (
                        <span className="text-xs text-green-600">Ödendi</span>
                      ) : (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => handlePaySingleSale(sale.id, 'CASH')}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            Nakit
                          </button>
                          <button
                            onClick={() => handlePaySingleSale(sale.id, 'CREDIT_CARD')}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            Kart
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam</p>
                  <p className="font-semibold">₺{totalSpent.toLocaleString('tr-TR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ödenen</p>
                  <p className="font-semibold text-green-600">₺{totalPaid.toLocaleString('tr-TR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kalan</p>
                  <p className={`font-semibold ${totalOwed > 0 ? 'text-red-600' : ''}`}>
                    ₺{totalOwed.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>

              {totalOwed > 0 && (
                <Button
                  className="w-full mt-4 bg-red-600 hover:bg-red-700"
                  onClick={() => setShowDebtModal(true)}
                >
                  Tüm Borcu Tahsil Et (₺{totalOwed})
                </Button>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">Henüz satış yok</p>
          )}
        </CardContent>
      </Card>

      {/* Personal Info (Collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setPersonalInfoOpen(!personalInfoOpen)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Kişisel Bilgiler
            </div>
            {personalInfoOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {personalInfoOpen && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.weight && (
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.weight} kg</span>
                </div>
              )}
              {customer.emergencyContact && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-red-500" />
                  <span>Acil: {customer.emergencyContact}</span>
                </div>
              )}
            </div>
            {customer.waiverSignedAt && (
              <div className="text-sm text-green-600">
                <Check className="w-4 h-4 inline mr-1" />
                Risk formu onaylandı: {new Date(customer.waiverSignedAt).toLocaleString('tr-TR')}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* QR Modal */}
      {showQrModal && qrCodeData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQrModal(false)}>
          <div className="bg-white p-8 rounded-lg text-center" onClick={e => e.stopPropagation()}>
            <img src={qrCodeData} alt="QR Code" className="w-64 h-64 mx-auto" />
            <p className="text-3xl font-mono font-bold mt-4">{customer.displayId}</p>
            <p className="text-muted-foreground">{customer.firstName} {customer.lastName}</p>
            <div className="flex gap-3 mt-4">
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
              <Button variant="outline" onClick={() => setShowQrModal(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pilot Reassign Confirm Modal */}
      {showPilotConfirm && nextPilot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Pilot Değişikliği</h3>
              <p className="text-muted-foreground">
                Sıradaki pilot <span className="font-semibold text-foreground">{nextPilot.name}</span> olarak atansın mı?
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPilotConfirm(false)
                  setNextPilot(null)
                }}
              >
                İptal
              </Button>
              <Button
                className="flex-1"
                onClick={confirmReassignPilot}
                disabled={reassigning}
              >
                {reassigning ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Onayla
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POS Modal */}
      {showPosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">Satış Ekle</h2>
                <p className="text-sm text-muted-foreground">
                  {customer.firstName} {customer.lastName} - {customer.displayId}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closePosModal}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Products */}
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Category Tabs */}
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                  {POS_CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      variant={posActiveCategory === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPosActiveCategory(cat)}
                      className="flex-shrink-0"
                    >
                      {cat === 'Favori' && <Star className="h-3 w-3 mr-1" />}
                      {cat}
                    </Button>
                  ))}
                </div>

                {/* Product Search */}
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün ara..."
                    value={posProductSearch}
                    onChange={(e) => setPosProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto">
                  {posLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : getPosDisplayProducts().length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Bu kategoride ürün yok
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {getPosDisplayProducts().map((product) => {
                        const isOutOfStock = product.stock !== null && product.stock <= 0
                        return (
                          <button
                            key={product.id}
                            onClick={() => addToPosCart(product)}
                            disabled={isOutOfStock}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              isOutOfStock
                                ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                                : 'bg-white hover:bg-primary/5 hover:border-primary active:scale-95'
                            }`}
                          >
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-lg font-bold text-primary">{product.price.toFixed(2)} ₺</p>
                            {product.stock !== null && (
                              <p className={`text-xs ${isOutOfStock ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {isOutOfStock ? 'Tükendi' : `Stok: ${product.stock}`}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart */}
              <div className="w-80 border-l flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold">
                      <ShoppingCart className="h-4 w-4" />
                      Sepet ({posCart.length})
                    </span>
                    {posCart.length > 0 && (
                      <button onClick={() => setPosCart([])} className="text-red-500 text-xs hover:underline">
                        Temizle
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {posCart.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sepet boş</p>
                    </div>
                  ) : (
                    posCart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.unitPrice.toFixed(2)} ₺ × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updatePosQuantity(item.productId, -1)}
                            className="p-1 rounded bg-white border hover:bg-gray-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updatePosQuantity(item.productId, 1)}
                            className="p-1 rounded bg-white border hover:bg-gray-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeFromPosCart(item.productId)}
                            className="p-1 rounded text-red-500 hover:bg-red-50 ml-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total & Payment */}
                <div className="p-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Toplam</span>
                    <span className="text-2xl font-bold">{posCartTotal.toFixed(2)} ₺</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handlePosPayment('CASH')}
                      disabled={posProcessing || posCart.length === 0}
                      className="h-12 bg-green-600 hover:bg-green-700"
                    >
                      {posProcessing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Banknote className="h-4 w-4 mr-1" />
                          Nakit
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handlePosPayment('CREDIT_CARD')}
                      disabled={posProcessing || posCart.length === 0}
                      className="h-12 bg-blue-600 hover:bg-blue-700"
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Kart
                    </Button>
                    <Button
                      onClick={() => handlePosPayment('TRANSFER')}
                      disabled={posProcessing || posCart.length === 0}
                      variant="outline"
                      className="h-10"
                    >
                      <Building className="h-4 w-4 mr-1" />
                      Havale
                    </Button>
                    <Button
                      onClick={() => handlePosPayment('CASH', 'UNPAID')}
                      disabled={posProcessing || posCart.length === 0}
                      variant="outline"
                      className="h-10 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Veresiye
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debt Collection Modal */}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Banknote className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Borç Tahsilatı</h3>
              <p className="text-muted-foreground">
                Toplam <span className="font-semibold text-red-600">₺{totalOwed}</span> borç tahsil edilecek
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {unpaidSales.length} adet ödenmemiş satış
              </p>
            </div>
            <p className="text-sm font-medium mb-3 text-center">Ödeme Yöntemi Seçin:</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Button
                onClick={() => handleCollectAllDebt('CASH')}
                disabled={collectingDebt}
                className="h-14 bg-green-600 hover:bg-green-700 flex-col"
              >
                {collectingDebt ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Banknote className="h-5 w-5 mb-1" />
                    <span className="text-xs">Nakit</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleCollectAllDebt('CREDIT_CARD')}
                disabled={collectingDebt}
                className="h-14 bg-blue-600 hover:bg-blue-700 flex-col"
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span className="text-xs">Kart</span>
              </Button>
              <Button
                onClick={() => handleCollectAllDebt('TRANSFER')}
                disabled={collectingDebt}
                variant="outline"
                className="h-14 flex-col"
              >
                <Building className="h-5 w-5 mb-1" />
                <span className="text-xs">Havale</span>
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDebtModal(false)}
              disabled={collectingDebt}
            >
              İptal
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
