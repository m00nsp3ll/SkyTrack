'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { productsApi, salesApi, customersApi, currencyApi } from '@/lib/api'
import {
  QrCode,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Building,
  Clock,
  User,
  ShoppingCart,
  RefreshCw,
  X,
  Receipt,
  Camera,
  AlertCircle,
  Check,
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import QR scanner to avoid SSR issues
const Html5QrcodePlugin = dynamic(
  () => import('@/components/QrScanner').then((mod) => mod.default),
  { ssr: false }
)

interface Product {
  id: string
  name: string
  category: string
  price: number
  priceCurrency: string
  isActive: boolean
  stock: number | null
}

interface CartItem {
  productId: string
  name: string
  category: string
  unitPrice: number
  quantity: number
}

interface PendingPayment {
  saleId: string
  itemName: string
  totalPrice: number
}

interface Customer {
  id: string
  displayId: string
  firstName: string
  lastName: string
  pilotName?: string
}

interface CustomerSale {
  id: string
  itemName: string
  quantity: number
  totalPrice: number
  totalAmountEUR?: number
  totalAmountTRY?: number
  primaryCurrency?: string
  paymentStatus: string
  createdAt: string
}

// A recorded payment entry (already confirmed)
interface PaymentEntry {
  id: string
  currency: Currency
  amount: number
  method: 'CASH' | 'CREDIT_CARD' | 'TRANSFER'
  eurEquivalent: number
}

type Currency = 'EUR' | 'USD' | 'GBP' | 'RUB' | 'TRY'

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'GBP', label: 'GBP', symbol: '£' },
  { value: 'RUB', label: 'RUB', symbol: '₽' },
  { value: 'TRY', label: 'TRY', symbol: '₺' },
]

const ALL_CATEGORIES = ['Rest', 'İçecek', 'Yiyecek', 'Hediyelik', 'Foto/Video', 'Diğer']

function getCurrencySymbol(currency: string): string {
  return CURRENCIES.find(c => c.value === currency)?.symbol || currency
}

function getMethodLabel(method: string): string {
  if (method === 'CASH') return 'Nakit'
  if (method === 'CREDIT_CARD') return 'Kart'
  if (method === 'TRANSFER') return 'Havale'
  return method
}

function getAvailableMethods(currency: Currency): ('CASH' | 'CREDIT_CARD' | 'TRANSFER')[] {
  if (currency === 'GBP' || currency === 'RUB') return ['CASH']
  return ['CASH', 'CREDIT_CARD', 'TRANSFER']
}

export default function POSPage() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSales, setCustomerSales] = useState<CustomerSale[]>([])
  const [customerBalance, setCustomerBalance] = useState(0)
  const [searchId, setSearchId] = useState('')
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Tüm Ürünler')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showQrScanner, setShowQrScanner] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Get visible categories based on role permissions
  const getVisibleCategories = (): string[] => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (!userStr) return ALL_CATEGORIES
      const user = JSON.parse(userStr)
      if (user.role === 'ADMIN') return ALL_CATEGORIES
      const permsStr = typeof window !== 'undefined' ? localStorage.getItem('permissions') : null
      if (!permsStr) return ALL_CATEGORIES
      const perms = JSON.parse(permsStr)
      if (!perms.posCategories) return ALL_CATEGORIES
      return ALL_CATEGORIES.filter(cat => perms.posCategories[cat])
    } catch {
      return ALL_CATEGORIES
    }
  }

  const visibleCategories = getVisibleCategories()

  // Currency state
  const [eurTryRate, setEurTryRate] = useState(0)
  const [allRates, setAllRates] = useState<Record<string, { buyRate: number; sellRate: number }>>({})
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string>('')

  // Currency converter tool state
  const [converterAmount, setConverterAmount] = useState('')
  const [converterFrom, setConverterFrom] = useState<Currency>('EUR')
  const [converterTo, setConverterTo] = useState<Currency>('USD')

  // New compact payment state
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([])
  const [activePayCurrency, setActivePayCurrency] = useState<Currency | null>(null)
  const [activePayMethod, setActivePayMethod] = useState<'CASH' | 'CREDIT_CARD' | 'TRANSFER'>('CASH')
  const [activePayAmount, setActivePayAmount] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const payAmountInputRef = useRef<HTMLInputElement>(null)

  // Rest price input state
  const [restProduct, setRestProduct] = useState<Product | null>(null)
  const [restPrice, setRestPrice] = useState('')
  const restPriceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProducts()
    fetchRates()
    const rateInterval = setInterval(fetchRates, 60000)
    return () => clearInterval(rateInterval)
  }, [])

  const fetchRates = async () => {
    setRatesLoading(true)
    try {
      const res = await currencyApi.getRates()
      const data = res.data?.data
      if (data) {
        setEurTryRate(data.eurTry || 0)
        setAllRates(data.rates || {})
        setRatesUpdatedAt(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))
      }
    } catch {
      // silently fail
    } finally {
      setRatesLoading(false)
    }
  }

  // --- Currency conversion helpers ---
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

  // General currency-to-currency conversion
  const convertCurrency = (amount: number, from: Currency, to: Currency): number => {
    if (from === to) return amount
    const eurAmount = convertToEUR(amount, from)
    return convertFromEUR(eurAmount, to)
  }

  // Get TRY equivalent for a currency (1 unit of currency = X TRY)
  const getTRYEquivalent = (currency: Currency): number => {
    if (currency === 'TRY') return 1
    if (currency === 'EUR') return eurTryRate
    // Convert 1 unit of currency to EUR, then to TRY
    const rate = allRates[currency]?.buyRate
    if (!rate || rate === 0) return 0
    return eurTryRate / rate
  }

  // --- Calculations ---
  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.totalPrice, 0)
  const grandTotal = cartTotal + pendingTotal // in EUR

  const paidTotalEUR = paymentEntries.reduce((sum, e) => sum + e.eurEquivalent, 0)
  const remainingEUR = grandTotal - paidTotalEUR

  const hasValidPayment = paidTotalEUR > 0 && remainingEUR <= 0.01
  const hasItems = cart.length > 0 || pendingPayments.length > 0

  // --- Payment entry helpers ---
  const addPaymentEntry = () => {
    if (!activePayCurrency) return
    const amount = parseFloat(activePayAmount)
    if (!amount || amount <= 0) return

    const eurEquivalent = convertToEUR(amount, activePayCurrency)
    setPaymentEntries(prev => [...prev, {
      id: String(Date.now()),
      currency: activePayCurrency,
      amount,
      method: activePayMethod,
      eurEquivalent,
    }])
    setActivePayAmount('')
    setActivePayCurrency(null)
  }

  const removePaymentEntry = (id: string) => {
    setPaymentEntries(prev => prev.filter(e => e.id !== id))
  }

  const clearPaymentEntries = () => {
    setPaymentEntries([])
    setActivePayCurrency(null)
    setActivePayAmount('')
  }

  // Quick full pay in a single currency
  const quickFullPay = (currency: Currency, method: 'CASH' | 'CREDIT_CARD' | 'TRANSFER') => {
    const currentRemaining = grandTotal - paymentEntries.reduce((sum, e) => sum + e.eurEquivalent, 0)
    if (currentRemaining <= 0.01) return
    const amountInCurrency = convertFromEUR(currentRemaining, currency)
    const rounded = Math.ceil(amountInCurrency * 100) / 100
    setPaymentEntries(prev => [...prev, {
      id: String(Date.now()),
      currency,
      amount: rounded,
      method,
      eurEquivalent: convertToEUR(rounded, currency),
    }])
    setActivePayCurrency(null)
    setActivePayAmount('')
  }

  // Open currency payment input
  const openCurrencyPay = (currency: Currency) => {
    setActivePayCurrency(currency)
    setActivePayMethod('CASH')
    // Pre-fill with remaining amount in that currency
    const currentRemaining = grandTotal - paymentEntries.reduce((sum, e) => sum + e.eurEquivalent, 0)
    if (currentRemaining > 0.01) {
      const amountInCurrency = convertFromEUR(currentRemaining, currency)
      const rounded = Math.ceil(amountInCurrency * 100) / 100
      setActivePayAmount(rounded.toFixed(2))
    } else {
      setActivePayAmount('')
    }
    setTimeout(() => payAmountInputRef.current?.focus(), 50)
  }

  // Auto-load customer from URL parameter
  useEffect(() => {
    const customerParam = searchParams.get('customer')
    if (customerParam && !customer) {
      setSearchId(customerParam)
      setSearchingCustomer(true)
      customersApi.getById(customerParam)
        .then(response => {
          const data = response.data.data
          const customerData = {
            id: data.id,
            displayId: data.displayId,
            firstName: data.firstName,
            lastName: data.lastName,
            pilotName: data.assignedPilot?.name,
          }
          setCustomer(customerData)
          setSearchId('')
          fetchCustomerSales(data.id, true)
        })
        .catch(() => {
          alert('Müşteri bulunamadı: ' + customerParam)
        })
        .finally(() => {
          setSearchingCustomer(false)
        })
    }
  }, [searchParams, customer])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const productsRes = await productsApi.getAll({ activeOnly: 'true' })
      setProducts(productsRes.data.data.products)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerSales = async (customerId: string, autoAddUnpaid = false) => {
    try {
      const response = await salesApi.getByCustomer(customerId)
      const data = response.data.data
      const sales = data.sales || []
      const sortedSales = [...sales].sort((a: CustomerSale, b: CustomerSale) => {
        if (a.paymentStatus === 'UNPAID' && b.paymentStatus !== 'UNPAID') return -1
        if (a.paymentStatus !== 'UNPAID' && b.paymentStatus === 'UNPAID') return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      setCustomerSales(sortedSales)
      setCustomerBalance(data.summary?.totalUnpaid || 0)

      if (autoAddUnpaid) {
        const unpaidSales = sortedSales.filter((sale: CustomerSale) => sale.paymentStatus === 'UNPAID')
        const newPendingPayments = unpaidSales.map((sale: CustomerSale) => ({
          saleId: sale.id,
          itemName: sale.itemName,
          totalPrice: sale.totalPrice,
        }))
        setPendingPayments(newPendingPayments)
      }
    } catch (error) {
      console.error('Failed to fetch customer sales:', error)
      setCustomerSales([])
      setCustomerBalance(0)
    }
  }

  const handlePayUnpaidSale = (sale: CustomerSale) => {
    const exists = pendingPayments.find(p => p.saleId === sale.id)
    if (!exists) {
      setPendingPayments(prev => [...prev, {
        saleId: sale.id,
        itemName: sale.itemName,
        totalPrice: sale.totalPrice,
      }])
    }
  }

  const removePendingPayment = (saleId: string) => {
    setPendingPayments(prev => prev.filter(p => p.saleId !== saleId))
  }

  const clearPendingPayments = () => {
    setPendingPayments([])
  }

  const searchCustomer = async () => {
    if (!searchId.trim()) return
    setSearchingCustomer(true)
    try {
      const response = await customersApi.getById(searchId.trim())
      const data = response.data.data
      const customerData = {
        id: data.id,
        displayId: data.displayId,
        firstName: data.firstName,
        lastName: data.lastName,
        pilotName: data.assignedPilot?.name,
      }
      setCustomer(customerData)
      setSearchId('')
      await fetchCustomerSales(data.id)
    } catch (error) {
      alert('Müşteri bulunamadı')
    } finally {
      setSearchingCustomer(false)
    }
  }

  const handleQrScan = async (decodedText: string) => {
    setShowQrScanner(false)
    let displayId = decodedText
    if (decodedText.includes('/c/')) {
      displayId = decodedText.split('/c/').pop() || decodedText
    }

    setSearchId(displayId)
    setSearchingCustomer(true)
    try {
      const response = await customersApi.getById(displayId)
      const data = response.data.data
      const customerData = {
        id: data.id,
        displayId: data.displayId,
        firstName: data.firstName,
        lastName: data.lastName,
        pilotName: data.assignedPilot?.name,
      }
      setCustomer(customerData)
      setSearchId('')
      await fetchCustomerSales(data.id)
    } catch (error) {
      alert('Müşteri bulunamadı: ' + displayId)
    } finally {
      setSearchingCustomer(false)
    }
  }

  const addToCart = (product: Product) => {
    if (product.stock !== null && product.stock <= 0) {
      alert('Bu ürün tükendi')
      return
    }

    // Rest category: show price input instead of adding directly
    if (product.category === 'Rest') {
      setRestProduct(product)
      setRestPrice('')
      setTimeout(() => restPriceInputRef.current?.focus(), 50)
      return
    }

    setCart((prev) => {
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

  const addRestToCart = () => {
    const price = parseFloat(restPrice)
    if (!restProduct || !price || price <= 0) return
    setCart((prev) => [
      ...prev,
      {
        productId: restProduct.id,
        name: restProduct.name,
        category: restProduct.category,
        unitPrice: price,
        quantity: 1,
      },
    ])
    setRestProduct(null)
    setRestPrice('')
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  const clearCustomer = () => {
    setCustomer(null)
    setCustomerSales([])
    setCustomerBalance(0)
    setPendingPayments([])
  }

  // --- Payment execution ---
  const handleConfirmPayment = async () => {
    if (!hasItems) return

    setProcessing(true)
    try {
      // 1. Process pending payments (update existing sales)
      for (const pending of pendingPayments) {
        const firstEntry = paymentEntries[0]
        await salesApi.updatePayment(
          pending.saleId,
          'PAID',
          firstEntry.method,
          firstEntry.currency
        )
      }

      // 2. Create new sales if cart has items
      if (cart.length > 0) {
        const items = cart.map((item) => ({
          productId: item.productId,
          itemType: item.category,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))

        const createData: any = {
          customerId: customer?.id,
          items,
          paymentStatus: 'PAID',
          paymentMethod: paymentEntries[0].method,
          primaryCurrency: paymentEntries[0].currency,
        }

        createData.paymentDetails = paymentEntries.map(entry => ({
          currency: entry.currency,
          amount: entry.amount,
          paymentMethod: entry.method,
        }))

        await salesApi.create(createData)
      }

      alert(`Ödeme tamamlandı: €${grandTotal.toFixed(2)}`)
      setCart([])
      setPendingPayments([])
      clearPaymentEntries()
      setShowConfirmModal(false)
      fetchProducts()

      if (customer) {
        await fetchCustomerSales(customer.id)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'İşlem başarısız')
    } finally {
      setProcessing(false)
    }
  }

  const handleVeresiye = async () => {
    if (cart.length === 0) return

    setProcessing(true)
    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        itemType: item.category,
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))

      await salesApi.create({
        customerId: customer?.id,
        items,
        paymentStatus: 'UNPAID',
        primaryCurrency: 'EUR',
      })

      alert(`Veresiye kaydedildi: €${cartTotal.toFixed(2)}`)
      setCart([])
      clearPaymentEntries()
      fetchProducts()

      if (customer) {
        await fetchCustomerSales(customer.id)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'İşlem başarısız')
    } finally {
      setProcessing(false)
    }
  }

  const getDisplayProducts = () => {
    let list: Product[] = []

    if (activeCategory === 'Tüm Ürünler') {
      // Only show products from visible categories
      list = products.filter((p) => visibleCategories.includes(p.category))
    } else if (activeCategory === 'Foto/Video') {
      list = products.filter((p) => ['VIDEO', 'PHOTO', 'PACKAGE', 'Foto/Video'].includes(p.category))
    } else {
      list = products.filter((p) => p.category === activeCategory)
    }

    if (productSearch) {
      const searchLower = productSearch.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(searchLower))
    }

    return list
  }

  const displayProducts = getDisplayProducts()

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-3">
      {/* TOP: Exchange Rates Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border shadow-sm flex-shrink-0">
        {/* Rates section - All in TRY */}
        <Banknote className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex items-center gap-4 overflow-x-auto">
          {/* EUR */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs font-bold">Euro:</span>
            <span className="text-xs font-semibold">₺{eurTryRate > 0 ? eurTryRate.toFixed(2) : '—'}</span>
          </div>
          {/* Other currencies - show TRY equivalent */}
          {CURRENCIES.filter(c => c.value !== 'EUR' && c.value !== 'TRY').map(c => {
            const tryEquiv = getTRYEquivalent(c.value)
            const labels: Record<string, string> = { USD: 'Dolar', GBP: 'Sterlin', RUB: 'Ruble' }
            return tryEquiv > 0 ? (
              <div key={c.value} className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs font-bold">{labels[c.value] || c.value}:</span>
                <span className="text-xs font-semibold">₺{tryEquiv.toFixed(c.value === 'RUB' ? 4 : 2)}</span>
              </div>
            ) : null
          })}
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchRates}
          disabled={ratesLoading}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className={`h-3 w-3 ${ratesLoading ? 'animate-spin' : ''}`} />
          Güncelle
        </button>
        {ratesUpdatedAt && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{ratesUpdatedAt}</span>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 flex-shrink-0 ml-auto" />

        {/* Currency converter tool */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs font-bold text-foreground whitespace-nowrap">Kur Hesapla:</span>
          <Input
            type="number"
            inputMode="decimal"
            value={converterAmount}
            onChange={(e) => setConverterAmount(e.target.value)}
            placeholder="Miktar"
            className="h-7 w-20 text-xs px-2"
          />
          <select
            value={converterFrom}
            onChange={(e) => setConverterFrom(e.target.value as Currency)}
            className="h-7 text-xs border rounded px-2 bg-white min-w-[80px]"
          >
            {CURRENCIES.map(c => (
              <option key={c.value} value={c.value}>{c.symbol} {c.value}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">→</span>
          <select
            value={converterTo}
            onChange={(e) => setConverterTo(e.target.value as Currency)}
            className="h-7 text-xs border rounded px-2 bg-white min-w-[80px]"
          >
            {CURRENCIES.map(c => (
              <option key={c.value} value={c.value}>{c.symbol} {c.value}</option>
            ))}
          </select>
          <div className="px-3 py-1 bg-green-50 border border-green-300 rounded text-sm font-bold text-green-700 min-w-[80px] text-center">
            {converterAmount && parseFloat(converterAmount) > 0
              ? `${getCurrencySymbol(converterTo)}${convertCurrency(parseFloat(converterAmount), converterFrom, converterTo).toFixed(2)}`
              : '—'
            }
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex gap-2 min-h-0">
        {/* LEFT: Customer Section */}
        <div className="w-72 lg:w-48 flex-shrink-0 flex flex-col gap-2 overflow-hidden">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Müşteri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  ref={searchInputRef}
                  placeholder="ST-20260207-001"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCustomer()}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={searchCustomer}
                  disabled={searchingCustomer}
                >
                  {searchingCustomer ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQrScanner(true)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {customer ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                      <p className="text-xs text-muted-foreground">{customer.displayId}</p>
                      {customer.pilotName && (
                        <p className="text-xs text-muted-foreground">Pilot: {customer.pilotName}</p>
                      )}
                    </div>
                    <button onClick={clearCustomer} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {customerBalance > 0 && (
                    <div className="mt-2 p-2 bg-yellow-100 rounded border border-yellow-300">
                      <div className="flex items-center gap-1 text-yellow-800">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs font-medium">Borç: €{customerBalance.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg text-center text-sm text-muted-foreground">
                  <QrCode className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  QR okutun veya ID girin
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => clearCustomer()}
              >
                Müşterisiz Satış
              </Button>
            </CardContent>
          </Card>

          {/* Customer Sales History */}
          {customer && (
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Satış Geçmişi ({customerSales.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-3">
                {customerSales.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Henüz satış yok
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customerSales.map((sale) => {
                      const isInPending = pendingPayments.some(p => p.saleId === sale.id)
                      return (
                        <div
                          key={sale.id}
                          className={`p-2 rounded text-xs ${
                            sale.paymentStatus === 'PAID'
                              ? 'bg-green-50 border border-green-200'
                              : isInPending
                              ? 'bg-blue-50 border border-blue-300'
                              : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{sale.itemName}</p>
                              <p className="text-muted-foreground">
                                {sale.quantity}x • {new Date(sale.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">€{sale.totalPrice.toFixed(2)}</p>
                              {sale.paymentStatus === 'PAID' ? (
                                <p className="text-green-600">Ödendi</p>
                              ) : isInPending ? (
                                <p className="text-blue-600">Sepette</p>
                              ) : (
                                <button
                                  onClick={() => handlePayUnpaidSale(sale)}
                                  className="mt-1 px-2 py-1 bg-red-500 text-white rounded text-[10px] hover:bg-red-600"
                                >
                                  Ödeme Al
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* CENTER: Products */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Category Tabs */}
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1 flex-wrap">
            <Button
              key="Tüm Ürünler"
              variant={activeCategory === 'Tüm Ürünler' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory('Tüm Ürünler')}
              className="flex-shrink-0"
            >
              Tüm Ürünler
            </Button>
            {visibleCategories.map((cat) => {
              const isRest = cat === 'Rest'
              const isActive = activeCategory === cat
              return (
                <Button
                  key={cat}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 ${isRest ? (isActive ? 'bg-red-600 hover:bg-red-700 border-red-600' : 'border-red-300 text-red-600 hover:bg-red-50') : ''}`}
                >
                  {cat}
                </Button>
              )
            })}
          </div>

          {/* Product Search */}
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün ara..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Bu kategoride ürün yok
              </div>
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-1.5">
                {displayProducts.map((product) => {
                  const isOutOfStock = product.stock !== null && product.stock <= 0
                  const isRest = product.category === 'Rest'
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isOutOfStock
                          ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                          : isRest
                          ? 'bg-red-50 hover:bg-red-100 hover:border-red-400 border-red-200 active:scale-95'
                          : 'bg-white hover:bg-primary/5 hover:border-primary active:scale-95'
                      }`}
                    >
                      <p className={`font-medium text-xs truncate ${isRest ? 'text-red-700' : ''}`}>{product.name}</p>
                      {isRest ? (
                        <p className="text-xs font-semibold text-red-500 mt-0.5">Tutar Girin</p>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-primary">€{product.price.toFixed(2)}</p>
                          {eurTryRate > 0 && (
                            <p className="text-[10px] text-muted-foreground">≈ ₺{(product.price * eurTryRate).toFixed(0)}</p>
                          )}
                        </>
                      )}
                      {product.stock !== null && (
                        <p className={`text-[10px] ${isOutOfStock ? 'text-red-500' : 'text-muted-foreground'}`}>
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

        {/* RIGHT: Cart + Payment (wider) */}
        <div className="w-96 lg:w-72 flex-shrink-0 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Sepet ({cart.length})
                </span>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-red-500 text-xs hover:underline">
                    Temizle
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-3 pt-0">
              {/* Pending Payments */}
              {pendingPayments.length > 0 && (
                <div className="mb-3 pb-3 border-b border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-red-600">Bekleyen Ödemeler</span>
                    <button onClick={clearPendingPayments} className="text-red-500 text-xs hover:underline">
                      Temizle
                    </button>
                  </div>
                  <div className="space-y-1">
                    {pendingPayments.map((pending) => (
                      <div
                        key={pending.saleId}
                        className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{pending.itemName}</p>
                          <p className="text-xs text-red-600">Ödeme bekliyor</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">€{pending.totalPrice.toFixed(2)}</span>
                          <button
                            onClick={() => removePendingPayment(pending.saleId)}
                            className="p-1 rounded text-red-500 hover:bg-red-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sepet boş</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          €{item.unitPrice.toFixed(2)} × {item.quantity} = <span className="font-medium">€{(item.unitPrice * item.quantity).toFixed(2)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="p-1 rounded bg-white border hover:bg-gray-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="p-1 rounded bg-white border hover:bg-gray-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total + Currency Equivalents */}
              <div className="border-t pt-3 mb-2">
                {pendingPayments.length > 0 && cart.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Bekleyen:</span>
                      <span>€{pendingTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yeni:</span>
                      <span>€{cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toplam</span>
                  <span className="text-2xl font-bold">€{grandTotal.toFixed(2)}</span>
                </div>
                {/* All currency equivalents */}
                {grandTotal > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 p-2 bg-gray-50 rounded-lg">
                    {CURRENCIES.filter(c => c.value !== 'EUR').map(c => {
                      const equiv = convertFromEUR(grandTotal, c.value)
                      return equiv > 0 ? (
                        <div key={c.value} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{c.label}</span>
                          <span className="font-semibold">{c.symbol}{equiv.toFixed(c.value === 'RUB' ? 0 : 2)}</span>
                        </div>
                      ) : null
                    })}
                  </div>
                )}
              </div>

              {/* ==================== */}
              {/* COMPACT PAYMENT SECTION */}
              {/* ==================== */}
              {hasItems && (
                <div className="border-t pt-3 space-y-2">
                  {/* Recorded payment entries */}
                  {paymentEntries.length > 0 && (
                    <div className="space-y-1">
                      {paymentEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between px-2 py-1.5 bg-blue-50 rounded border border-blue-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{getCurrencySymbol(entry.currency)}{entry.amount.toFixed(2)}</span>
                            <span className="text-muted-foreground">{getMethodLabel(entry.method)}</span>
                            {entry.currency !== 'EUR' && (
                              <span className="text-muted-foreground">= €{entry.eurEquivalent.toFixed(2)}</span>
                            )}
                          </div>
                          <button onClick={() => removePaymentEntry(entry.id)} className="p-0.5 text-red-500 hover:bg-red-100 rounded">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Remaining info */}
                  {remainingEUR > 0.01 ? (
                    <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                      <div className="flex items-center justify-between text-xs font-medium text-orange-700 mb-1">
                        <span>Kalan:</span>
                        <span className="font-bold">€{remainingEUR.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 text-[10px] text-orange-600">
                        {CURRENCIES.filter(c => c.value !== 'EUR').map(c => {
                          const equiv = convertFromEUR(remainingEUR, c.value)
                          return equiv > 0 ? (
                            <span key={c.value}>{c.symbol}{equiv.toFixed(2)}</span>
                          ) : null
                        })}
                      </div>
                    </div>
                  ) : paidTotalEUR > 0 ? (
                    <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-xs font-medium text-green-700 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      Tutar tamam
                      {remainingEUR < -0.01 && (
                        <span className="ml-1 text-[10px] opacity-70">(Para üstü: €{Math.abs(remainingEUR).toFixed(2)})</span>
                      )}
                    </div>
                  ) : null}

                  {/* Currency payment buttons */}
                  {remainingEUR > 0.01 && (
                    <>
                      {/* Active currency input */}
                      {activePayCurrency ? (
                        <div className="p-2 bg-gray-50 rounded-lg border space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold w-8">{getCurrencySymbol(activePayCurrency)}</span>
                            <Input
                              ref={payAmountInputRef}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={activePayAmount}
                              onChange={(e) => setActivePayAmount(e.target.value)}
                              placeholder="0.00"
                              className="h-8 text-sm font-medium flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addPaymentEntry()
                                if (e.key === 'Escape') setActivePayCurrency(null)
                              }}
                            />
                            <button
                              onClick={addPaymentEntry}
                              disabled={!activePayAmount || parseFloat(activePayAmount) <= 0}
                              className="px-2 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setActivePayCurrency(null)}
                              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* Method selector */}
                          <div className="flex gap-1">
                            {getAvailableMethods(activePayCurrency).map(m => (
                              <button
                                key={m}
                                onClick={() => setActivePayMethod(m)}
                                className={`flex-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                                  activePayMethod === m
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
                          {activePayCurrency !== 'EUR' && parseFloat(activePayAmount) > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              = €{convertToEUR(parseFloat(activePayAmount), activePayCurrency).toFixed(2)}
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Currency buttons grid */
                        <div className="grid grid-cols-5 gap-1">
                          {CURRENCIES.map(c => {
                            const amountInCurrency = convertFromEUR(remainingEUR, c.value)
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
                                onClick={() => openCurrencyPay(c.value)}
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
                        if (!hasValidPayment) {
                          alert('Ödeme tutarını girin')
                          return
                        }
                        setShowConfirmModal(true)
                      }}
                      disabled={processing || !hasItems || !hasValidPayment}
                      className="h-12 bg-green-600 hover:bg-green-700"
                    >
                      {processing ? (
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Banknote className="h-5 w-5 mr-1" />
                          Ödeme Al
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleVeresiye}
                      disabled={processing || cart.length === 0}
                      variant="outline"
                      className="h-12 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Clock className="h-5 w-5 mr-1" />
                      Veresiye
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Ödeme Onayı</h3>

            {/* Cart Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Toplam Tutar</span>
                <span className="text-xl font-bold">€{grandTotal.toFixed(2)}</span>
              </div>
              {eurTryRate > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  ≈ ₺{(grandTotal * eurTryRate).toFixed(2)}
                </p>
              )}
            </div>

            {/* Payment Details */}
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium">Ödeme Detayları</p>
              {paymentEntries.map((entry) => (
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
              {remainingEUR < -0.01 && (
                <div className="p-2 bg-yellow-50 rounded border border-yellow-200 text-xs">
                  <span className="text-yellow-700">Para üstü: €{Math.abs(remainingEUR).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Customer info */}
            {customer && (
              <div className="mb-4 p-2 bg-green-50 rounded text-xs">
                <span className="font-medium">{customer.firstName} {customer.lastName}</span>
                <span className="text-muted-foreground ml-2">({customer.displayId})</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmModal(false)}
                disabled={processing}
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleConfirmPayment}
                disabled={processing}
              >
                {processing ? (
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

      {/* Rest Price Input Modal */}
      {restProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full mx-4 shadow-2xl border-2 border-red-200">
            <h3 className="text-lg font-bold text-red-700 mb-1">Rest Ödemesi</h3>
            <p className="text-sm text-muted-foreground mb-4">{restProduct.name} — tutar girin</p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-red-600">€</span>
              <Input
                ref={restPriceInputRef}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={restPrice}
                onChange={(e) => setRestPrice(e.target.value)}
                placeholder="0.00"
                className="text-xl font-bold h-12 border-red-300 focus:border-red-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addRestToCart()
                  if (e.key === 'Escape') setRestProduct(null)
                }}
              />
            </div>
            {restPrice && parseFloat(restPrice) > 0 && eurTryRate > 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                ≈ ₺{(parseFloat(restPrice) * eurTryRate).toFixed(2)}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRestProduct(null)}
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={addRestToCart}
                disabled={!restPrice || parseFloat(restPrice) <= 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Sepete Ekle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">QR Kod Tara</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowQrScanner(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="aspect-square bg-black rounded-lg overflow-hidden">
              <Html5QrcodePlugin
                fps={10}
                qrbox={250}
                disableFlip={false}
                qrCodeSuccessCallback={handleQrScan}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center mt-3">
              Müşteri QR kodunu kameraya gösterin
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
