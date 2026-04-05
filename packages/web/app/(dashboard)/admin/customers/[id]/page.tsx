'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { io } from 'socket.io-client'
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
  Banknote,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  Minus,
  Trash2,
  Star,
  Search,
  CreditCard,
  Building,
} from 'lucide-react'
import { productsApi, salesApi, currencyApi } from '@/lib/api'

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
  signatureData: string | null
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

interface PaymentDetail {
  id: string
  currency: string
  amount: number
  amountInEUR: number
  amountInTRY: number
  paymentMethod: string
}

interface Sale {
  id: string
  itemName: string
  quantity: number
  totalPrice: number
  totalAmountEUR?: number
  totalAmountTRY?: number
  primaryCurrency?: string
  paymentStatus: string
  paymentMethod?: string
  createdAt: string
  soldBy?: { id: string; name: string | null; username: string } | null
  paymentDetails?: PaymentDetail[]
}

interface MediaFile {
  filename: string
  url: string
  thumbnailUrl?: string  // deprecated - kept for backward compat
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

  // Current user role
  const [userRole, setUserRole] = useState<string>('OFFICE_STAFF')
  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) { try { setUserRole(JSON.parse(u).role || 'OFFICE_STAFF') } catch {} }
  }, [])
  const canCollectPayment = userRole === 'ADMIN' || userRole === 'OFFICE_STAFF'
  const [copied, setCopied] = useState(false)
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false)

  // Action states
  const [reassigning, setReassigning] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [openingFolder, setOpeningFolder] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [showPilotModal, setShowPilotModal] = useState(false)
  const [availablePilots, setAvailablePilots] = useState<{ id: string; name: string; dailyFlightCount: number; maxDailyFlights: number; queuePosition: number }[]>([])
  const [loadingPilots, setLoadingPilots] = useState(false)
  const [pilotSearch, setPilotSearch] = useState('')
  const [selectedPilot, setSelectedPilot] = useState<{ id: string; name: string } | null>(null)
  const [showPilotConfirmDialog, setShowPilotConfirmDialog] = useState(false)

  // Currency state
  const [eurTryRate, setEurTryRate] = useState(0)
  const [allRates, setAllRates] = useState<Record<string, { buyRate: number; sellRate: number }>>({})

  type Currency = 'EUR' | 'USD' | 'GBP' | 'RUB' | 'TRY'

  const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
    { value: 'EUR', label: 'EUR', symbol: '€' },
    { value: 'USD', label: 'USD', symbol: '$' },
    { value: 'GBP', label: 'GBP', symbol: '£' },
    { value: 'RUB', label: 'RUB', symbol: '₽' },
    { value: 'TRY', label: 'TRY', symbol: '₺' },
  ]

  const getCurrencySymbol = (currency: string) => CURRENCIES.find(c => c.value === currency)?.symbol || currency
  const getMethodLabel = (method: string) => method === 'CASH' ? 'Nakit' : method === 'CREDIT_CARD' ? 'Kart' : method === 'TRANSFER' ? 'Havale' : method
  const getAvailableMethods = (currency: Currency): ('CASH' | 'CREDIT_CARD' | 'TRANSFER')[] => {
    if (currency === 'GBP' || currency === 'RUB') return ['CASH']
    return ['CASH', 'CREDIT_CARD', 'TRANSFER']
  }
  const convertToEUR = (amount: number, fromCurrency: Currency): number => {
    if (fromCurrency === 'EUR') return amount
    const rate = allRates[fromCurrency]?.buyRate
    if (!rate || rate === 0) return amount
    return amount / rate
  }

  const convertFromEUR = (eurAmount: number, toCurrency: Currency): number => {
    if (toCurrency === 'EUR') return eurAmount
    const rate = allRates[toCurrency]?.buyRate
    if (!rate || rate === 0) return eurAmount
    return eurAmount * rate
  }

  // Media state
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [mediaPrice, setMediaPrice] = useState('25')
  const [mediaCurrency, setMediaCurrency] = useState<Currency>('EUR')
  const [mediaSentToCashier, setMediaSentToCashier] = useState(false)

  // POS Modal state
  const [showPosModal, setShowPosModal] = useState(false)
  const [posProducts, setPosProducts] = useState<any[]>([])
  const [posCart, setPosCart] = useState<any[]>([])
  const [posActiveCategory, setPosActiveCategory] = useState('Tüm Ürünler')
  const [posProductSearch, setPosProductSearch] = useState('')
  const [posLoading, setPosLoading] = useState(false)
  const [posProcessing, setPosProcessing] = useState(false)
  const [showPosConfirmModal, setShowPosConfirmModal] = useState(false)
  // Compact payment state for POS modal (matches main POS page)
  const [posPaymentEntries, setPosPaymentEntries] = useState<{ id: string; currency: Currency; amount: number; method: 'CASH' | 'CREDIT_CARD' | 'TRANSFER'; eurEquivalent: number }[]>([])
  const [posActivePayCurrency, setPosActivePayCurrency] = useState<Currency | null>(null)
  const [posActivePayMethod, setPosActivePayMethod] = useState<'CASH' | 'CREDIT_CARD' | 'TRANSFER'>('CASH')
  const [posActivePayAmount, setPosActivePayAmount] = useState('')
  const posPayAmountInputRef = useRef<HTMLInputElement>(null)

  // Debt collection modal state
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [collectingDebt, setCollectingDebt] = useState(false)
  const [debtPaymentEntries, setDebtPaymentEntries] = useState<{ id: string; currency: Currency; amount: number; method: 'CASH' | 'CREDIT_CARD' | 'TRANSFER'; eurEquivalent: number }[]>([])
  const [debtActivePayCurrency, setDebtActivePayCurrency] = useState<Currency | null>(null)
  const [debtActivePayMethod, setDebtActivePayMethod] = useState<'CASH' | 'CREDIT_CARD' | 'TRANSFER'>('CASH')
  const [debtActivePayAmount, setDebtActivePayAmount] = useState('')
  const debtPayAmountInputRef = useRef<HTMLInputElement>(null)

  // Timers
  const [waitingTime, setWaitingTime] = useState<string>('')
  const [flightTime, setFlightTime] = useState<string>('')

  // Fetch currency rates
  const fetchRates = useCallback(async () => {
    try {
      const res = await currencyApi.getRates()
      const data = res.data?.data
      if (data) {
        setEurTryRate(data.eurTry || 0)
        setAllRates(data.rates || {})
      }
    } catch { /* silently fail */ }
  }, [])

  // Generic compact payment helpers
  type CompactPayState = {
    entries: { id: string; currency: Currency; amount: number; method: 'CASH' | 'CREDIT_CARD' | 'TRANSFER'; eurEquivalent: number }[]
    setEntries: React.Dispatch<React.SetStateAction<CompactPayState['entries']>>
    setActiveCurrency: React.Dispatch<React.SetStateAction<Currency | null>>
    setActiveMethod: React.Dispatch<React.SetStateAction<'CASH' | 'CREDIT_CARD' | 'TRANSFER'>>
    setActiveAmount: React.Dispatch<React.SetStateAction<string>>
    activeCurrency: Currency | null
    activeMethod: 'CASH' | 'CREDIT_CARD' | 'TRANSFER'
    activeAmount: string
    inputRef: React.RefObject<HTMLInputElement | null>
  }

  const addCompactEntry = (s: CompactPayState) => {
    if (!s.activeCurrency) return
    const amount = parseFloat(s.activeAmount)
    if (!amount || amount <= 0) return
    const eurEquivalent = convertToEUR(amount, s.activeCurrency)
    s.setEntries(prev => [...prev, { id: String(Date.now()), currency: s.activeCurrency!, amount, method: s.activeMethod, eurEquivalent }])
    s.setActiveAmount('')
    s.setActiveCurrency(null)
  }

  const removeCompactEntry = (s: CompactPayState, id: string) => {
    s.setEntries(prev => prev.filter(e => e.id !== id))
  }

  const openCompactCurrencyPay = (s: CompactPayState, currency: Currency, totalEUR: number) => {
    s.setActiveCurrency(currency)
    s.setActiveMethod('CASH')
    const currentRemaining = totalEUR - s.entries.reduce((sum, e) => sum + e.eurEquivalent, 0)
    if (currentRemaining > 0.01) {
      const amountInCurrency = convertFromEUR(currentRemaining, currency)
      const rounded = Math.ceil(amountInCurrency * 100) / 100
      s.setActiveAmount(rounded.toFixed(2))
    } else {
      s.setActiveAmount('')
    }
    setTimeout(() => s.inputRef.current?.focus(), 50)
  }

  const getCompactPaidTotal = (entries: CompactPayState['entries']) => entries.reduce((sum, e) => sum + e.eurEquivalent, 0)
  const getCompactRemaining = (entries: CompactPayState['entries'], totalEUR: number) => totalEUR - getCompactPaidTotal(entries)
  const isCompactPaymentValid = (entries: CompactPayState['entries'], totalEUR: number) => getCompactPaidTotal(entries) > 0 && getCompactRemaining(entries, totalEUR) <= 0.01

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
    fetchRates()
    const rateInterval = setInterval(fetchRates, 60000)
    return () => clearInterval(rateInterval)
  }, [fetchCustomer, fetchRates])

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

      if ((customer.flights?.[0]?.mediaFolder?.fileCount ?? 0) > 0) {
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
            .pilot-name { font-size: 12px; font-weight: bold; color: #333; margin-top: 3px; }
            .datetime { font-size: 10px; color: #888; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrCodeData}" alt="QR Code" class="qr-code" />
            <div class="display-id">${customer.displayId}</div>
            <div class="customer-name">${customer.firstName} ${customer.lastName}</div>
            ${customer.assignedPilot ? `<div class="pilot-name">Pilot: ${customer.assignedPilot.name}</div>` : ''}
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

      const waiverText = `YAMAC PARASUTU UCUSU RISK KABUL VE SORUMLULUK BEYANI

Isbu belge, Sinirli Sorumlu Alanya Yamac Parasutu ve Spor Turizm Gelistirme Kooperatifi bunyesinde gerceklestirilecek tandem yamac parasutu ucusuna iliskin olarak duzenlenmistir.

Bu belgeyi imzalayarak asagidaki hususlari kabul ve beyan ederim:

1. Yamac parasutu sporu dogasi geregi tehlikeli bir aktivitedir ve kaza riski tasimaktadir.

2. Ben yamac parasutu ile tandem ucusu yapmak icin gerekli on egitimi ve bilgilendirmeyi pilotumdan aldim, bu konuda tum bilgilere sahibim ve tum riskleri kabul ederek kendi istegimle ucusa hazirim.

3. Ucus sirasinda hava kosullari, ekipman arizasi veya diger ongorulemeyen durumlar nedeniyle kaza meydana gelebilecegini biliyorum.

4. Herhangi bir saglik problemim (kalp hastaligi, epilepsi, hamilelik, vb.) bulunmamaktadir veya varsa pilot ve yetkilere bildirdim.

5. Ucus oncesi verilen tum guvenlik talimatlarina uyacagimi taahhut ederim.

6. Tandem ucusu RAY SIGORTA A.S. guvencesindedir. Meydana gelebilecek herhangi bir kazada Alanya Ilce Sportif Turizm Kurulu Ucus Kontrol Heyeti, Kooperatif ve isletmesini yuruten sirketten/pilotundan ve diger sahislardan hicbir hak ve talep etmeyecegimi kabul ederim.

7. Ucus sirasinda cekilen fotograf ve videolarin Kooperatif tarafindan kayit altina alinabilecegini ve bu gorsel/isitsel kayitlarin hizmet sunumu amaciyla kullanilabilecegini kabul ederim.

8. 18 yasindan buyuk oldugumu veya yasal veli/vasi onayi aldigimi beyan ederim.`

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
            .signature-img {
              max-width: 200px;
              max-height: 80px;
              border-bottom: 1px solid #000;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>S.S. Alanya Yamac Parasutu ve Spor Turizm Gelistirme Kooperatifi</h1>
            <h2>RISK KABUL VE SORUMLULUK BEYANI</h2>
          </div>

          <div class="info-box">
            <p><strong>Musteri No:</strong> ${customer.displayId}</p>
            <p><strong>Ad Soyad:</strong> ${customer.firstName} ${customer.lastName}</p>
            <p><strong>Telefon:</strong> ${customer.phone}</p>
            <p><strong>Tarih:</strong> ${dateStr}</p>
            <p><strong>Saat:</strong> ${timeStr}</p>
          </div>

          <div class="waiver-text">${waiverText}</div>

          <p style="font-size: 11px; margin-bottom: 20px; font-style: italic;">Bu formu imzalayarak Kisisel Verilerin Korunmasi Kanunu (KVKK) Aydinlatma Metni kapsaminda kisisel verilerimin islenmesine onay verdigimi kabul ederim.</p>

          <div class="signature-section">
            <h3>IMZA</h3>
            <p>Yukaridaki beyani okudum, anladim ve kabul ediyorum.</p>
            <p class="signature-name">${customer.firstName} ${customer.lastName}</p>
            ${customer.signatureData ? `<img src="${customer.signatureData}" alt="Imza" class="signature-img" />` : '<div style="border-bottom: 1px solid #000; width: 200px; height: 60px; margin-top: 10px;"></div>'}
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
      const res = await api.post(`/media/${customer.id}/open-folder`)
      const smbPath = res.data?.data?.smbPath
      if (!smbPath) throw new Error('SMB path alınamadı')
      window.open(smbPath)
    } catch (error: any) {
      alert(error.response?.data?.error?.message || error.message || 'Klasör açılamadı')
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

  const handleMediaPayment = async () => {
    if (!customer) return
    const priceNum = parseFloat(mediaPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Geçerli bir tutar girin')
      return
    }

    // Keep original price in original currency — backend will handle EUR conversion
    const priceInEUR = mediaCurrency === 'EUR' ? priceNum : convertToEUR(priceNum, mediaCurrency)

    setProcessingPayment(true)
    try {
      // 1. Update media folder if exists (may not exist for all customers)
      try {
        await api.patch(`/media/${customer.id}/payment`, {
          status: 'PENDING',
          amount: priceInEUR,
        })
      } catch {
        // Media folder may not exist — that's OK, sale will still be created
      }

      // 2. Create UNPAID sale — store in ORIGINAL currency (not EUR)
      await salesApi.create({
        customerId: customer.id,
        items: [{
          productId: null,
          itemType: 'Foto/Video',
          itemName: 'Foto/Video Paketi',
          quantity: 1,
          unitPrice: priceNum,  // original amount in original currency
        }],
        paymentStatus: 'UNPAID',
        primaryCurrency: mediaCurrency,
        paymentDetails: [],
      })

      setMediaSentToCashier(true)
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'İşlem başarısız')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleReassignPilot = async () => {
    if (!customer) return
    setShowPilotModal(true)
    setLoadingPilots(true)
    setPilotSearch('')
    setSelectedPilot(null)
    try {
      // Fetch queue and available pilots
      const response = await api.get('/pilots/queue')
      const queueData = response.data.data
      // Get all available pilots (exclude current pilot and limit-reached ones)
      const allPilots = (queueData?.queue || []).filter(
        (p: any) =>
          p.status === 'AVAILABLE' &&
          p.dailyFlightCount < p.maxDailyFlights &&
          p.id !== customer.assignedPilot?.id
      )
      setAvailablePilots(allPilots)
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Pilot bilgisi alınamadı')
      setShowPilotModal(false)
    } finally {
      setLoadingPilots(false)
    }
  }

  const handleSelectPilot = (pilot: { id: string; name: string }) => {
    setSelectedPilot(pilot)
    setShowPilotConfirmDialog(true)
  }

  const confirmReassignPilot = async () => {
    if (!customer || !selectedPilot) return
    setReassigning(true)
    setShowPilotConfirmDialog(false)
    setShowPilotModal(false)
    try {
      await api.post(`/customers/${customer.id}/reassign-pilot`, { pilotId: selectedPilot.id })
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Pilot atanamadı')
    } finally {
      setReassigning(false)
      setSelectedPilot(null)
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

  const handleCollectAllDebt = async () => {
    if (!customer || unpaidSales.length === 0) return
    if (!isCompactPaymentValid(debtPaymentEntries, totalOwed)) {
      alert('Ödeme tutarını girin')
      return
    }
    setCollectingDebt(true)
    try {
      const firstEntry = debtPaymentEntries[0]
      await salesApi.bulkPay(customer.id, firstEntry.method, firstEntry.currency)
      setDebtPaymentEntries([])
      setDebtActivePayCurrency(null)
      setDebtActivePayAmount('')
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

  // Lock body scroll when POS modal is open
  useEffect(() => {
    if (showPosModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showPosModal])

  // POS Modal functions
  const openPosModal = async () => {
    setShowPosModal(true)
    setPosLoading(true)
    try {
      const productsRes = await productsApi.getAll({ activeOnly: 'true' })
      setPosProducts(productsRes.data.data.products || [])
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
    setPosActiveCategory('Tüm Ürünler')
    setPosPaymentEntries([])
    setPosActivePayCurrency(null)
    setPosActivePayAmount('')
  }

  // POS compact payment helpers
  const addPosPaymentEntry = () => {
    if (!posActivePayCurrency) return
    const amount = parseFloat(posActivePayAmount)
    if (!amount || amount <= 0) return
    const eurEquivalent = convertToEUR(amount, posActivePayCurrency)
    setPosPaymentEntries(prev => [...prev, {
      id: String(Date.now()),
      currency: posActivePayCurrency,
      amount,
      method: posActivePayMethod,
      eurEquivalent,
    }])
    setPosActivePayAmount('')
    setPosActivePayCurrency(null)
  }

  const removePosPaymentEntry = (id: string) => {
    setPosPaymentEntries(prev => prev.filter(e => e.id !== id))
  }

  const openPosCurrencyPay = (currency: Currency) => {
    setPosActivePayCurrency(currency)
    setPosActivePayMethod('CASH')
    const currentRemaining = posCartTotal - posPaymentEntries.reduce((sum, e) => sum + e.eurEquivalent, 0)
    if (currentRemaining > 0.01) {
      const amountInCurrency = convertFromEUR(currentRemaining, currency)
      const rounded = Math.ceil(amountInCurrency * 100) / 100
      setPosActivePayAmount(rounded.toFixed(2))
    } else {
      setPosActivePayAmount('')
    }
    setTimeout(() => posPayAmountInputRef.current?.focus(), 50)
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
  const posPaidTotalEUR = posPaymentEntries.reduce((sum, e) => sum + e.eurEquivalent, 0)
  const posRemainingEUR = posCartTotal - posPaidTotalEUR
  const posHasValidPayment = posPaidTotalEUR > 0 && posRemainingEUR <= 0.01

  const handlePosPaymentConfirm = async () => {
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
        paymentStatus: 'PAID',
        paymentMethod: posPaymentEntries[0].method,
        primaryCurrency: posPaymentEntries[0].currency,
        paymentDetails: posPaymentEntries.map(entry => ({
          currency: entry.currency,
          amount: entry.amount,
          paymentMethod: entry.method,
        })),
      })

      setShowPosConfirmModal(false)
      closePosModal()
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Satış kaydedilemedi')
    } finally {
      setPosProcessing(false)
    }
  }

  const handlePosVeresiye = async () => {
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
        paymentStatus: 'UNPAID',
        primaryCurrency: 'EUR',
      })

      closePosModal()
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Satış kaydedilemedi')
    } finally {
      setPosProcessing(false)
    }
  }

  const getPosDisplayProducts = () => {
    let list: any[] = []
    if (posActiveCategory === 'Tüm Ürünler') {
      list = posProducts
    } else if (posActiveCategory === 'Foto/Video') {
      list = posProducts.filter((p) => ['VIDEO', 'PHOTO', 'PACKAGE', 'Foto/Video'].includes(p.category))
    } else {
      list = posProducts.filter((p) => p.category === posActiveCategory)
    }
    if (posProductSearch) {
      const searchLower = posProductSearch.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(searchLower))
    }
    return list
  }

  const POS_CATEGORIES = ['Tüm Ürünler', 'Rest', 'İçecek', 'Yiyecek', 'Hediyelik', 'Foto/Video', 'Diğer']

  // Computed values
  const flight = customer?.flights[0]
  const mediaFolder = flight?.mediaFolder || customer?.mediaFolders[0]
  const status = customer ? statusConfig[customer.status] || statusConfig.REGISTERED : null

  const isFlightCompleted = customer?.status === 'COMPLETED'
  const hasMedia = mediaFolder && mediaFolder.fileCount > 0
  const isPaid = mediaFolder?.paymentStatus === 'PAID'
  const isDelivered = mediaFolder?.deliveryStatus === 'DELIVERED'

  // Check if there's already an unpaid Foto/Video sale (sent to cashier)
  const hasUnpaidMediaSale = customer?.sales?.some(
    (s: any) => s.itemType === 'Foto/Video' && s.paymentStatus === 'UNPAID'
  ) || false

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
      warnings.push({ type: 'warning', message: `Ödeme bekliyor — €${mediaPrice}` })
    }

    // POS debt
    if (totalOwed > 0) {
      warnings.push({ type: 'warning', message: `Ödenmemiş POS borcu: €${totalOwed.toFixed(2)}` })
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
              <Button size="sm" onClick={openPosModal} className="ml-2">
                <Plus className="w-4 h-4 mr-1" />
                Satış Ekle
              </Button>
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

              {/* File preview */}
              {mediaFiles.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mediaFiles.slice(0, 5).map((_file, i) => (
                    <div key={i} className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                  {mediaFiles.length > 5 && (
                    <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                      <span className="text-sm font-medium">+{mediaFiles.length - 5}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment section — Kiosk style */}
              <div className="border-t pt-6">
                {(mediaSentToCashier || hasUnpaidMediaSale) ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 text-center">
                      <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                      <p className="text-lg font-bold text-blue-700">Kasaya Yönlendirildi</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Müşteriye borç yazıldı — kasada ödeme bekliyor
                      </p>
                    </div>

                    {/* Download link + QR — visible after sent to cashier */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                      <p className="font-semibold text-green-700 mb-3">Müşteri İndirme Linki</p>
                      <div className="flex items-center gap-2 mb-4">
                        <code className="bg-white px-3 py-2 rounded-lg flex-1 text-sm border truncate">
                          {typeof window !== 'undefined' ? getCustomerPageUrl(customer.displayId) : `https://skytrackyp.com/c/${customer.displayId}`}
                        </code>
                        <Button variant="outline" size="sm" onClick={handleCopyLink}>
                          Kopyala
                        </Button>
                      </div>
                      <div className="flex justify-center">
                        <Button variant="outline" size="lg" onClick={() => setShowQrModal(true)} className="gap-2">
                          <QrCode className="w-6 h-6" />
                          QR Kodu Göster
                        </Button>
                      </div>
                      <p className="text-xs text-green-600 mt-3">
                        Ödeme yapıldıktan sonra müşteri bu linkten foto/videolarını indirebilir
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-lg font-bold text-center">Foto/Video Ücreti</p>

                    {/* Price input — large centered */}
                    <div className="flex items-center justify-center gap-3">
                      <Input
                        type="number"
                        value={mediaPrice}
                        onChange={(e) => setMediaPrice(e.target.value)}
                        className="w-32 h-14 text-2xl font-bold text-center"
                        inputMode="decimal"
                      />
                      <span className="text-2xl font-bold text-muted-foreground">
                        {CURRENCIES.find(c => c.value === mediaCurrency)?.symbol || '€'}
                      </span>
                    </div>

                    {/* EUR / TRY equivalent */}
                    {mediaCurrency !== 'EUR' && parseFloat(mediaPrice) > 0 && (
                      <p className="text-sm text-muted-foreground text-center">
                        ≈ €{convertToEUR(parseFloat(mediaPrice), mediaCurrency).toFixed(2)}
                      </p>
                    )}
                    {mediaCurrency === 'EUR' && eurTryRate > 0 && parseFloat(mediaPrice) > 0 && (
                      <p className="text-sm text-muted-foreground text-center">
                        ≈ ₺{(parseFloat(mediaPrice) * eurTryRate).toFixed(0)}
                      </p>
                    )}

                    {/* Currency selector — large colorful kiosk buttons */}
                    <div className="grid grid-cols-5 gap-2">
                      {CURRENCIES.map(c => {
                        const colorMap: Record<Currency, { active: string; idle: string; text: string }> = {
                          EUR: { active: 'bg-blue-600 border-blue-600 text-white shadow-blue-200', idle: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100', text: 'text-blue-600' },
                          USD: { active: 'bg-green-600 border-green-600 text-white shadow-green-200', idle: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100', text: 'text-green-600' },
                          GBP: { active: 'bg-purple-600 border-purple-600 text-white shadow-purple-200', idle: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100', text: 'text-purple-600' },
                          RUB: { active: 'bg-red-600 border-red-600 text-white shadow-red-200', idle: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100', text: 'text-red-600' },
                          TRY: { active: 'bg-orange-600 border-orange-600 text-white shadow-orange-200', idle: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100', text: 'text-orange-600' },
                        }
                        const colors = colorMap[c.value]
                        const isActive = mediaCurrency === c.value
                        return (
                          <button
                            key={c.value}
                            onClick={() => setMediaCurrency(c.value)}
                            className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 font-bold transition-all active:scale-95 ${
                              isActive ? `${colors.active} shadow-lg` : colors.idle
                            }`}
                          >
                            <span className="text-2xl">{c.symbol}</span>
                            <span className="text-[10px] mt-0.5 font-medium opacity-80">{c.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    <Button
                      className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 rounded-xl"
                      disabled={processingPayment || isNaN(parseFloat(mediaPrice)) || parseFloat(mediaPrice) <= 0}
                      onClick={handleMediaPayment}
                    >
                      {processingPayment ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
                      Kasaya Yönlendir
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Müşteriye borç yazılacak — kasada ödeme sonrası indirme aktif olacak
                    </p>
                  </div>
                )}
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
                      €{mediaFolder?.paidAmount || mediaPrice} Ödendi
                      {mediaFolder?.paymentMethod && ` (${mediaFolder.paymentMethod === 'CASH' ? 'Nakit' : mediaFolder.paymentMethod === 'CREDIT_CARD' ? 'Kart' : 'Havale'})`}
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
                  <div className="mt-3 text-center text-orange-600 text-sm">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Müşteri henüz indirmedi
                  </div>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.sales.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Ürün</th>
                      <th className="pb-2 font-medium">Adet</th>
                      <th className="pb-2 font-medium">Tutar</th>
                      <th className="pb-2 font-medium">Ödeme</th>
                      <th className="pb-2 font-medium">Personel</th>
                      <th className="pb-2 font-medium">Tarih</th>
                      <th className="pb-2 font-medium text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedSales.map((sale) => (
                      <tr key={sale.id} className={sale.paymentStatus !== 'PAID' ? 'bg-red-50' : ''}>
                        <td className="py-2 font-medium">{sale.itemName}</td>
                        <td className="py-2">{sale.quantity}</td>
                        <td className="py-2">€{sale.totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{sale.totalAmountTRY ? ` (₺${sale.totalAmountTRY.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})` : ''}</td>
                        <td className="py-2">
                          {sale.paymentStatus === 'PAID' && sale.paymentDetails && sale.paymentDetails.length > 0 ? (
                            <div className="space-y-0.5">
                              {sale.paymentDetails.map((pd, i) => (
                                <div key={pd.id || i} className="text-xs">
                                  <span className="font-medium">
                                    {pd.paymentMethod === 'CASH' ? 'Nakit' : pd.paymentMethod === 'CREDIT_CARD' ? 'Kart' : pd.paymentMethod === 'TRANSFER' ? 'Havale' : pd.paymentMethod}
                                  </span>
                                  {' '}
                                  <span className="text-muted-foreground">
                                    ({pd.currency} {pd.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : sale.paymentStatus === 'PAID' ? (
                            <>
                              {sale.paymentMethod === 'CASH' ? 'Nakit' : sale.paymentMethod === 'CREDIT_CARD' ? 'Kart' : sale.paymentMethod === 'TRANSFER' ? 'Havale' : sale.paymentMethod || '-'}
                              {sale.primaryCurrency && ` (${sale.primaryCurrency})`}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2">{sale.soldBy?.name || sale.soldBy?.username || '-'}</td>
                        <td className="py-2 whitespace-nowrap">
                          {new Date(sale.createdAt).toLocaleDateString('tr-TR')} {new Date(sale.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 text-right">
                          {sale.paymentStatus === 'PAID' ? (
                            <span className="text-xs text-green-600 font-medium">Ödendi</span>
                          ) : canCollectPayment ? (
                            <div className="flex gap-1 justify-end">
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
                          ) : (
                            <span className="text-xs text-orange-600 font-medium">Ödenmedi</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam</p>
                  <p className="font-semibold">€{totalSpent.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ödenen</p>
                  <p className="font-semibold text-green-600">€{totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kalan</p>
                  <p className={`font-semibold ${totalOwed > 0 ? 'text-red-600' : ''}`}>
                    €{totalOwed.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {totalOwed > 0 && canCollectPayment && (
                <Button
                  className="w-full mt-4 bg-red-600 hover:bg-red-700"
                  onClick={() => setShowDebtModal(true)}
                >
                  Tüm Borcu Tahsil Et (€{totalOwed.toFixed(2)})
                </Button>
              )}
              {totalOwed > 0 && !canCollectPayment && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
                  <p className="text-sm text-orange-700 font-medium">€{totalOwed.toFixed(2)} ödenmemiş borç</p>
                  <p className="text-xs text-orange-500 mt-1">Tahsilat kasada yapılacak</p>
                </div>
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

      {/* Pilot Reassign Modal */}
      {showPilotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Pilot Değiştir</h3>
              <p className="text-sm text-muted-foreground">
                Mevcut pilot: <span className="font-semibold text-foreground">{customer.assignedPilot?.name}</span>
              </p>
            </div>

            {loadingPilots ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Next pilot button */}
                {availablePilots.length > 0 && (
                  <Button
                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-base"
                    onClick={() => handleSelectPilot({ id: availablePilots[0].id, name: availablePilots[0].name })}
                    disabled={reassigning}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Sıradaki Pilot: {availablePilots[0].name}
                  </Button>
                )}

                {/* Divider */}
                {availablePilots.length > 1 && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">veya pilot seç</span>
                      </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pilot ismi ara..."
                        value={pilotSearch}
                        onChange={(e) => setPilotSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Available pilots list */}
                    <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg">
                      {availablePilots
                        .filter(p => p.id !== availablePilots[0]?.id)
                        .filter(p => !pilotSearch || p.name.toLowerCase().includes(pilotSearch.toLowerCase()))
                        .map((pilot) => (
                          <button
                            key={pilot.id}
                            onClick={() => handleSelectPilot({ id: pilot.id, name: pilot.name })}
                            disabled={reassigning}
                            className="w-full flex items-center justify-between p-3 hover:bg-blue-50 transition-colors text-left border-b last:border-b-0"
                          >
                            <div>
                              <p className="font-medium">{pilot.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Sıra: {pilot.queuePosition}
                              </p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {pilot.dailyFlightCount}/{pilot.maxDailyFlights}
                            </span>
                          </button>
                        ))}
                    </div>
                  </>
                )}

                {availablePilots.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Müsait pilot bulunmuyor</p>
                )}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                setShowPilotModal(false)
                setSelectedPilot(null)
                setPilotSearch('')
              }}
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {/* Pilot Reassign Confirm Dialog */}
      {showPilotConfirmDialog && selectedPilot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-2">Pilot Değişikliği Onayı</h3>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{customer.assignedPilot?.name}</span> yerine{' '}
                <span className="font-semibold text-foreground">{selectedPilot.name}</span> atansın mı?
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPilotConfirmDialog(false)
                  setSelectedPilot(null)
                }}
              >
                Vazgeç
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
        <div className="fixed inset-0 w-screen h-screen bg-black/50 flex items-center justify-center z-[100]" style={{ top: 0, left: 0 }}>
          <div className="bg-white rounded-lg w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">Satış Ekle</h2>
                <p className="text-sm text-muted-foreground">
                  {customer.firstName} {customer.lastName} - {customer.displayId}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closePosModal} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
                            <p className="text-lg font-bold text-primary">€{product.price.toFixed(2)}</p>
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
                            €{item.unitPrice.toFixed(2)} × {item.quantity}
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
                    <span className="text-2xl font-bold">€{posCartTotal.toFixed(2)}</span>
                  </div>
                  {posCartTotal > 0 && eurTryRate > 0 && (
                    <p className="text-xs text-muted-foreground text-right">≈ ₺{(posCartTotal * eurTryRate).toFixed(0)}</p>
                  )}

                  {posCart.length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      {/* Recorded payment entries */}
                      {posPaymentEntries.length > 0 && (
                        <div className="space-y-1">
                          {posPaymentEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between px-2 py-1.5 bg-blue-50 rounded border border-blue-200 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{getCurrencySymbol(entry.currency)}{entry.amount.toFixed(2)}</span>
                                <span className="text-muted-foreground">{getMethodLabel(entry.method)}</span>
                                {entry.currency !== 'EUR' && (
                                  <span className="text-muted-foreground">= €{entry.eurEquivalent.toFixed(2)}</span>
                                )}
                              </div>
                              <button onClick={() => removePosPaymentEntry(entry.id)} className="p-0.5 text-red-500 hover:bg-red-100 rounded">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Remaining info */}
                      {posRemainingEUR > 0.01 ? (
                        <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="flex items-center justify-between text-xs font-medium text-orange-700 mb-1">
                            <span>Kalan:</span>
                            <span className="font-bold">€{posRemainingEUR.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-2 text-[10px] text-orange-600">
                            {CURRENCIES.filter(c => c.value !== 'EUR').map(c => {
                              const equiv = convertFromEUR(posRemainingEUR, c.value)
                              return equiv > 0 ? (
                                <span key={c.value}>{c.symbol}{equiv.toFixed(2)}</span>
                              ) : null
                            })}
                          </div>
                        </div>
                      ) : posPaidTotalEUR > 0 ? (
                        <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-xs font-medium text-green-700 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          Tutar tamam
                          {posRemainingEUR < -0.01 && (
                            <span className="ml-1 text-[10px] opacity-70">(Para üstü: €{Math.abs(posRemainingEUR).toFixed(2)})</span>
                          )}
                        </div>
                      ) : null}

                      {/* Currency payment buttons */}
                      {posRemainingEUR > 0.01 && (
                        <>
                          {posActivePayCurrency ? (
                            <div className="p-2 bg-gray-50 rounded-lg border space-y-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold w-8">{getCurrencySymbol(posActivePayCurrency)}</span>
                                <Input
                                  ref={posPayAmountInputRef}
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min="0"
                                  value={posActivePayAmount}
                                  onChange={(e) => setPosActivePayAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="h-8 text-sm font-medium flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') addPosPaymentEntry()
                                    if (e.key === 'Escape') setPosActivePayCurrency(null)
                                  }}
                                />
                                <button
                                  onClick={addPosPaymentEntry}
                                  disabled={!posActivePayAmount || parseFloat(posActivePayAmount) <= 0}
                                  className="px-2 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setPosActivePayCurrency(null)}
                                  className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {/* Method selector */}
                              <div className="flex gap-1">
                                {getAvailableMethods(posActivePayCurrency).map(m => (
                                  <button
                                    key={m}
                                    onClick={() => setPosActivePayMethod(m)}
                                    className={`flex-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                                      posActivePayMethod === m
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                    }`}
                                  >
                                    {m === 'CASH' && <Banknote className="h-3 w-3 inline mr-0.5" />}
                                    {m === 'CREDIT_CARD' && <CreditCard className="h-3 w-3 inline mr-0.5" />}
                                    {m === 'TRANSFER' && <Building className="h-3 w-3 inline mr-0.5" />}
                                    {getMethodLabel(m)}
                                  </button>
                                ))}
                              </div>
                              {/* EUR equivalent preview */}
                              {posActivePayCurrency !== 'EUR' && parseFloat(posActivePayAmount) > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  = €{convertToEUR(parseFloat(posActivePayAmount), posActivePayCurrency).toFixed(2)}
                                </p>
                              )}
                            </div>
                          ) : (
                            /* Currency buttons grid */
                            <div className="grid grid-cols-5 gap-1">
                              {CURRENCIES.map(c => {
                                const amountInCurrency = convertFromEUR(posRemainingEUR, c.value)
                                const symbolColor: Record<Currency, string> = {
                                  EUR: 'text-blue-600',
                                  USD: 'text-green-600',
                                  GBP: 'text-purple-600',
                                  RUB: 'text-red-600',
                                  TRY: 'text-orange-600',
                                }
                                return (
                                  <button
                                    key={c.value}
                                    onClick={() => openPosCurrencyPay(c.value)}
                                    className="flex flex-col items-center p-2 rounded-lg border bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors active:scale-95"
                                  >
                                    <span className={`text-base font-bold ${symbolColor[c.value]}`}>{c.symbol}</span>
                                    <span className="text-[10px] font-medium text-muted-foreground">{amountInCurrency.toFixed(c.value === 'RUB' ? 0 : 2)}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          onClick={() => {
                            if (!posHasValidPayment) {
                              alert('Ödeme tutarını girin')
                              return
                            }
                            setShowPosConfirmModal(true)
                          }}
                          disabled={posProcessing || !posHasValidPayment}
                          className="h-12 bg-green-600 hover:bg-green-700"
                        >
                          {posProcessing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Banknote className="h-4 w-4 mr-1" />
                              Ödeme Al
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handlePosVeresiye}
                          disabled={posProcessing}
                          variant="outline"
                          className="h-12 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Veresiye
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS Confirm Modal */}
      {showPosConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Ödeme Onayı</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Toplam Tutar</span>
                <span className="text-xl font-bold">€{posCartTotal.toFixed(2)}</span>
              </div>
              {eurTryRate > 0 && (
                <p className="text-xs text-muted-foreground text-right">≈ ₺{(posCartTotal * eurTryRate).toFixed(0)}</p>
              )}
            </div>
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium">Ödeme Detayları</p>
              {posPaymentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-100">
                  <div>
                    <span className="text-sm font-medium">
                      {getCurrencySymbol(entry.currency)}{entry.amount.toFixed(2)} {entry.currency}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({getMethodLabel(entry.method)})
                    </span>
                  </div>
                  {entry.currency !== 'EUR' && (
                    <div className="text-right">
                      <p className="text-xs font-medium">= €{entry.eurEquivalent.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Kur: 1€ = {getCurrencySymbol(entry.currency)}{(allRates[entry.currency]?.buyRate || 0).toFixed(
                          entry.currency === 'RUB' ? 4 : 2
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Change / overpayment */}
              {posRemainingEUR < -0.01 && (
                <div className="p-2 bg-yellow-50 rounded border border-yellow-200 text-xs">
                  <span className="text-yellow-700">Para üstü: €{Math.abs(posRemainingEUR).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPosConfirmModal(false)}
                disabled={posProcessing}
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handlePosPaymentConfirm}
                disabled={posProcessing}
              >
                {posProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Onayla
              </Button>
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
                Toplam <span className="font-semibold text-red-600">€{totalOwed.toFixed(2)}</span> borç tahsil edilecek
              </p>
              {eurTryRate > 0 && (
                <p className="text-xs text-muted-foreground mt-1">≈ ₺{(totalOwed * eurTryRate).toFixed(0)}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {unpaidSales.length} adet ödenmemiş satış
              </p>
            </div>
            <p className="text-sm font-medium mb-3">Ödeme Detayları:</p>

            {(() => {
              const debtPaidEUR = debtPaymentEntries.reduce((sum, e) => sum + e.eurEquivalent, 0)
              const debtRemaining = totalOwed - debtPaidEUR
              const debtValid = debtPaidEUR > 0 && debtRemaining <= 0.01

              return (
                <div className="space-y-2">
                  {/* Recorded payment entries */}
                  {debtPaymentEntries.length > 0 && (
                    <div className="space-y-1">
                      {debtPaymentEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between px-2 py-1.5 bg-blue-50 rounded border border-blue-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{getCurrencySymbol(entry.currency)}{entry.amount.toFixed(2)}</span>
                            <span className="text-muted-foreground">{getMethodLabel(entry.method)}</span>
                            {entry.currency !== 'EUR' && (
                              <span className="text-muted-foreground">= €{entry.eurEquivalent.toFixed(2)}</span>
                            )}
                          </div>
                          <button onClick={() => removeCompactEntry({ entries: debtPaymentEntries, setEntries: setDebtPaymentEntries, setActiveCurrency: setDebtActivePayCurrency, setActiveMethod: setDebtActivePayMethod, setActiveAmount: setDebtActivePayAmount, activeCurrency: debtActivePayCurrency, activeMethod: debtActivePayMethod, activeAmount: debtActivePayAmount, inputRef: debtPayAmountInputRef }, entry.id)} className="p-0.5 text-red-500 hover:bg-red-100 rounded">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Remaining info */}
                  {debtRemaining > 0.01 ? (
                    <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                      <div className="flex items-center justify-between text-xs font-medium text-orange-700 mb-1">
                        <span>Kalan:</span>
                        <span className="font-bold">€{debtRemaining.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 text-[10px] text-orange-600">
                        {CURRENCIES.filter(c => c.value !== 'EUR').map(c => {
                          const equiv = convertFromEUR(debtRemaining, c.value)
                          return equiv > 0 ? (
                            <span key={c.value}>{c.symbol}{equiv.toFixed(2)}</span>
                          ) : null
                        })}
                      </div>
                    </div>
                  ) : debtPaidEUR > 0 ? (
                    <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-xs font-medium text-green-700 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      Tutar tamam
                      {debtRemaining < -0.01 && (
                        <span className="ml-1 text-[10px] opacity-70">(Para üstü: €{Math.abs(debtRemaining).toFixed(2)})</span>
                      )}
                    </div>
                  ) : null}

                  {/* Currency payment buttons */}
                  {debtRemaining > 0.01 && (
                    <>
                      {debtActivePayCurrency ? (
                        <div className="p-2 bg-gray-50 rounded-lg border space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold w-8">{getCurrencySymbol(debtActivePayCurrency)}</span>
                            <Input
                              ref={debtPayAmountInputRef}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={debtActivePayAmount}
                              onChange={(e) => setDebtActivePayAmount(e.target.value)}
                              placeholder="0.00"
                              className="h-8 text-sm font-medium flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addCompactEntry({ entries: debtPaymentEntries, setEntries: setDebtPaymentEntries, setActiveCurrency: setDebtActivePayCurrency, setActiveMethod: setDebtActivePayMethod, setActiveAmount: setDebtActivePayAmount, activeCurrency: debtActivePayCurrency, activeMethod: debtActivePayMethod, activeAmount: debtActivePayAmount, inputRef: debtPayAmountInputRef })
                                if (e.key === 'Escape') setDebtActivePayCurrency(null)
                              }}
                            />
                            <button
                              onClick={() => addCompactEntry({ entries: debtPaymentEntries, setEntries: setDebtPaymentEntries, setActiveCurrency: setDebtActivePayCurrency, setActiveMethod: setDebtActivePayMethod, setActiveAmount: setDebtActivePayAmount, activeCurrency: debtActivePayCurrency, activeMethod: debtActivePayMethod, activeAmount: debtActivePayAmount, inputRef: debtPayAmountInputRef })}
                              disabled={!debtActivePayAmount || parseFloat(debtActivePayAmount) <= 0}
                              className="px-2 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDebtActivePayCurrency(null)}
                              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* Method selector */}
                          <div className="flex gap-1">
                            {getAvailableMethods(debtActivePayCurrency).map(m => (
                              <button
                                key={m}
                                onClick={() => setDebtActivePayMethod(m)}
                                className={`flex-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                                  debtActivePayMethod === m
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {m === 'CASH' && <Banknote className="h-3 w-3 inline mr-0.5" />}
                                {m === 'CREDIT_CARD' && <CreditCard className="h-3 w-3 inline mr-0.5" />}
                                {m === 'TRANSFER' && <Building className="h-3 w-3 inline mr-0.5" />}
                                {getMethodLabel(m)}
                              </button>
                            ))}
                          </div>
                          {/* EUR equivalent preview */}
                          {debtActivePayCurrency !== 'EUR' && parseFloat(debtActivePayAmount) > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              = €{convertToEUR(parseFloat(debtActivePayAmount), debtActivePayCurrency).toFixed(2)}
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Currency buttons grid */
                        <div className="grid grid-cols-5 gap-1">
                          {CURRENCIES.map(c => {
                            const amountInCurrency = convertFromEUR(debtRemaining, c.value)
                            const symbolColor: Record<Currency, string> = {
                              EUR: 'text-blue-600',
                              USD: 'text-green-600',
                              GBP: 'text-purple-600',
                              RUB: 'text-red-600',
                              TRY: 'text-orange-600',
                            }
                            return (
                              <button
                                key={c.value}
                                onClick={() => openCompactCurrencyPay({ entries: debtPaymentEntries, setEntries: setDebtPaymentEntries, setActiveCurrency: setDebtActivePayCurrency, setActiveMethod: setDebtActivePayMethod, setActiveAmount: setDebtActivePayAmount, activeCurrency: debtActivePayCurrency, activeMethod: debtActivePayMethod, activeAmount: debtActivePayAmount, inputRef: debtPayAmountInputRef }, c.value, totalOwed)}
                                className="flex flex-col items-center p-2 rounded-lg border bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors active:scale-95"
                              >
                                <span className={`text-base font-bold ${symbolColor[c.value]}`}>{c.symbol}</span>
                                <span className="text-[10px] font-medium text-muted-foreground">{amountInCurrency.toFixed(c.value === 'RUB' ? 0 : 2)}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}

                  <Button
                    className="w-full mt-2 bg-green-600 hover:bg-green-700"
                    onClick={handleCollectAllDebt}
                    disabled={collectingDebt || !debtValid}
                  >
                    {collectingDebt ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Tahsil Et
                  </Button>
                </div>
              )
            })()}

            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setShowDebtModal(false)
                setDebtPaymentEntries([])
                setDebtActivePayCurrency(null)
                setDebtActivePayAmount('')
              }}
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
