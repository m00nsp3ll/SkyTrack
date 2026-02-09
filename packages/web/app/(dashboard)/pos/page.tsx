'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { productsApi, salesApi, customersApi } from '@/lib/api'
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
  paymentStatus: string
  createdAt: string
}

const CATEGORIES = ['Tüm Ürünler', 'İçecek', 'Yiyecek', 'Hediyelik', 'Fotoğraf/Video', 'Diğer']

export default function POSPage() {
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

  useEffect(() => {
    fetchProducts()
  }, [])

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

  const fetchCustomerSales = async (customerId: string) => {
    try {
      const response = await salesApi.getByCustomer(customerId)
      const data = response.data.data
      const sales = data.sales || []
      // Sort: unpaid first, then by date desc
      const sortedSales = [...sales].sort((a: CustomerSale, b: CustomerSale) => {
        if (a.paymentStatus === 'UNPAID' && b.paymentStatus !== 'UNPAID') return -1
        if (a.paymentStatus !== 'UNPAID' && b.paymentStatus === 'UNPAID') return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      setCustomerSales(sortedSales)

      // Use summary from API
      setCustomerBalance(data.summary?.totalUnpaid || 0)
    } catch (error) {
      console.error('Failed to fetch customer sales:', error)
      setCustomerSales([])
      setCustomerBalance(0)
    }
  }

  const handlePayUnpaidSale = (sale: CustomerSale) => {
    // Add to pending payments (not cart)
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
      // Fetch customer's previous sales
      await fetchCustomerSales(data.id)
    } catch (error) {
      alert('Müşteri bulunamadı')
    } finally {
      setSearchingCustomer(false)
    }
  }

  const handleQrScan = async (decodedText: string) => {
    setShowQrScanner(false)
    // Extract displayId from URL like http://192.168.1.100:3000/c/ST-20260207-001
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
      // Fetch customer's previous sales
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

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.totalPrice, 0)
  const grandTotal = cartTotal + pendingTotal

  const handlePayment = async (paymentMethod: 'CASH' | 'CREDIT_CARD' | 'TRANSFER', paymentStatus: 'PAID' | 'UNPAID' = 'PAID') => {
    if (cart.length === 0 && pendingPayments.length === 0) {
      alert('Sepet boş')
      return
    }

    setProcessing(true)
    try {
      // 1. Process pending payments (update existing sales)
      for (const pending of pendingPayments) {
        await salesApi.updatePayment(pending.saleId, 'PAID', paymentMethod)
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

        await salesApi.create({
          customerId: customer?.id,
          items,
          paymentStatus,
          paymentMethod: paymentStatus === 'PAID' ? paymentMethod : undefined,
        })
      }

      alert(`Ödeme tamamlandı: ${grandTotal.toFixed(2)} TL`)
      setCart([])
      setPendingPayments([])
      fetchProducts() // Refresh stock

      // Refresh customer sales if customer is selected
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
      list = products
    } else if (activeCategory === 'Fotoğraf/Video') {
      // Include VIDEO, PHOTO, PACKAGE categories
      list = products.filter((p) => ['VIDEO', 'PHOTO', 'PACKAGE', 'Fotoğraf/Video'].includes(p.category))
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
    <div className="h-[calc(100vh-80px)] flex gap-4">
      {/* LEFT: Customer Section */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-hidden">
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
                {/* Customer Balance */}
                {customerBalance > 0 && (
                  <div className="mt-2 p-2 bg-yellow-100 rounded border border-yellow-300">
                    <div className="flex items-center gap-1 text-yellow-800">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-xs font-medium">Bakiye: {customerBalance.toFixed(2)} ₺</span>
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
                            <p className="font-medium">{sale.totalPrice.toFixed(2)} ₺</p>
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
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Product Search */}
        <div className="mb-3">
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
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {displayProducts.map((product) => {
                const isOutOfStock = product.stock !== null && product.stock <= 0
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
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

      {/* RIGHT: Cart */}
      <div className="w-80 flex-shrink-0 flex flex-col">
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
          <CardContent className="flex-1 flex flex-col overflow-hidden">
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
                        <span className="text-sm font-medium">{pending.totalPrice.toFixed(2)} ₺</span>
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
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
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
                        {item.unitPrice.toFixed(2)} ₺ × {item.quantity}
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

            {/* Total */}
            <div className="border-t pt-3 mb-3">
              {pendingPayments.length > 0 && cart.length > 0 && (
                <div className="text-xs text-muted-foreground mb-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Bekleyen ödemeler:</span>
                    <span>{pendingTotal.toFixed(2)} ₺</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yeni satışlar:</span>
                    <span>{cartTotal.toFixed(2)} ₺</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Toplam</span>
                <span className="text-2xl font-bold">{grandTotal.toFixed(2)} ₺</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handlePayment('CASH')}
                disabled={processing || (cart.length === 0 && pendingPayments.length === 0)}
                className="h-14 bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Banknote className="h-5 w-5 mr-2" />
                    Nakit
                  </>
                )}
              </Button>
              <Button
                onClick={() => handlePayment('CREDIT_CARD')}
                disabled={processing || (cart.length === 0 && pendingPayments.length === 0)}
                className="h-14 bg-blue-600 hover:bg-blue-700"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Kart
              </Button>
              <Button
                onClick={() => handlePayment('TRANSFER')}
                disabled={processing || (cart.length === 0 && pendingPayments.length === 0)}
                variant="outline"
                className="h-12"
              >
                <Building className="h-4 w-4 mr-2" />
                Havale
              </Button>
              <Button
                onClick={() => handlePayment('CASH', 'UNPAID')}
                disabled={processing || cart.length === 0}
                variant="outline"
                className="h-12 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              >
                <Clock className="h-4 w-4 mr-2" />
                Veresiye
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
