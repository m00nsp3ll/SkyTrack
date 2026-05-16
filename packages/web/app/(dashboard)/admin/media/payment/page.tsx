'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, currencyApi } from '@/lib/api'
import { QrCode, CheckCircle, Search, Banknote, CreditCard, Building, X } from 'lucide-react'

interface CustomerData {
  id: string
  displayId: string
  name: string
  surname: string
  flights: Array<{
    pilot?: { name: string }
    mediaFolder?: { id: string; paymentAmount?: number }
  }>
  media?: {
    fileCount: number
    totalSize: number
    canDownload: boolean
  }
}

interface Rates {
  EUR_USD?: { buyRate: number; sellRate: number }
  EUR_TRY?: { buyRate: number; sellRate: number }
  EUR_GBP?: { buyRate: number; sellRate: number }
  EUR_RUB?: { buyRate: number; sellRate: number }
}

type Currency = 'EUR' | 'USD' | 'GBP' | 'RUB' | 'TRY'
type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'TRANSFER'

export default function MediaPaymentPage() {
  const [manualId, setManualId] = useState('')
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [rates, setRates] = useState<Rates>({})
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('EUR')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Sadece medya ödemesi varsa göster
  const mediaFolder = customer?.flights?.[0]?.mediaFolder
  const hasSale = !!(mediaFolder?.paymentAmount && mediaFolder.paymentAmount > 0)
  const totalEUR = hasSale ? (mediaFolder?.paymentAmount || 0) : 0

  const fetchRates = useCallback(async () => {
    try {
      const res = await currencyApi.getRates()
      setRates(res.data?.data?.rates || res.data?.rates || {})
    } catch {
      // rates fetch failed silently
    }
  }, [])

  const lookupCustomer = useCallback(async (displayId: string) => {
    setError('')
    setSuccess(false)
    setCustomer(null)
    if (!displayId.trim()) return

    try {
      setLoading(true)
      const res = await api.get(`/customers/public/${displayId.trim()}`)
      setCustomer(res.data)
      await fetchRates()
    } catch {
      setError('Müşteri bulunamadı')
    } finally {
      setLoading(false)
    }
  }, [fetchRates])

  const scannerRef = { current: null as any }

  const handleScan = useCallback(async () => {
    if (scanning) {
      // Kapatma
      if (scannerRef.current) { try { await scannerRef.current.stop() } catch {} }
      scannerRef.current = null
      setScanning(false)
      return
    }
    setScanning(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      scannerRef.current = new Html5Qrcode('qr-reader-payment')
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          if (scannerRef.current) { scannerRef.current.stop().catch(() => {}) }
          scannerRef.current = null
          setScanning(false)
          const match = decodedText.match(/\/c\/([A-Za-z0-9]+)/)
          const id = match ? match[1] : decodedText
          setManualId(id)
          lookupCustomer(id)
        },
        () => {}
      )
    } catch {
      setScanning(false)
      setError('Kamera erişimi sağlanamadı')
    }
  }, [lookupCustomer, scanning])

  const convertAmount = (currency: Currency): number => {
    if (currency === 'EUR') return totalEUR
    const rateKey = `EUR_${currency}` as keyof Rates
    const rate = rates[rateKey]
    if (!rate) return 0
    return Math.round(totalEUR * rate.sellRate * 100) / 100
  }

  const handlePaymentClick = () => {
    if (!customer || !hasSale) return
    setShowConfirm(true)
  }

  const handlePaymentConfirm = async () => {
    setShowConfirm(false)
    if (!customer) return
    const mediaFolderId = customer.flights?.[0]?.mediaFolder?.id
    if (!mediaFolderId) {
      setError('Medya klasörü bulunamadı')
      return
    }

    try {
      setLoading(true)
      await api.post(`/media/${mediaFolderId}/payment`, {
        amount: totalEUR,
        currency: selectedCurrency,
        paymentMethod: paymentMethod,
      })
      setSuccess(true)
    } catch {
      setError('Odeme islemi basarisiz')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCustomer(null)
    setManualId('')
    setError('')
    setSuccess(false)
    setSelectedCurrency('EUR')
    setPaymentMethod('CASH')
  }

  const currencyButtons: { currency: Currency; symbol: string; color: string }[] = [
    { currency: 'EUR', symbol: '\u20AC', color: '#2563eb' },
    { currency: 'USD', symbol: '$', color: '#16a34a' },
    { currency: 'GBP', symbol: '\u00A3', color: '#7c3aed' },
    { currency: 'RUB', symbol: '\u20BD', color: '#dc2626' },
    { currency: 'TRY', symbol: '\u20BA', color: '#ea580c' },
  ]

  if (success) {
    return (
      <div style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto' }}>
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle style={{ width: 64, height: 64, color: '#16a34a', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.5rem' }}>
              Ödeme Alındı
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              {customer?.name} {customer?.surname} - {convertAmount(selectedCurrency)} {selectedCurrency}
            </p>
            <Button onClick={resetForm} className="w-full">
              Yeni İşlem
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Foto/Video Tahsilat</h1>

      {/* QR Scanner Section */}
      <Card style={{ marginBottom: '1rem' }}>
        <CardContent className="p-4">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Input
              placeholder="Müşteri ID"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookupCustomer(manualId)}
              style={{ flex: 1 }}
            />
            <Button size="icon" variant="outline" onClick={() => lookupCustomer(manualId)} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={handleScan} style={{ backgroundColor: scanning ? '#dc2626' : '#7c3aed', color: 'white' }}>
              {scanning ? <X className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
            </Button>
          </div>
          {scanning && <div id="qr-reader-payment" style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 8 }} />}
          {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>}
        </CardContent>
      </Card>

      {/* Customer Info */}
      {customer && (
        <>
          <Card style={{ marginBottom: '1rem', borderLeft: '4px solid #7c3aed' }}>
            <CardContent className="p-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '1rem' }}>{customer.name} {customer.surname}</p>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>#{customer.displayId}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    Pilot: {customer.flights?.[0]?.pilot?.name || '-'}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    {customer.media?.fileCount || 0} dosya / {((customer.media?.totalSize || 0) / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section — sadece satış varsa göster */}
          {!hasSale ? (
            <Card style={{ marginBottom: '1rem' }}>
              <CardContent className="p-6 text-center">
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Foto/video satışı yapılmamış</p>
              </CardContent>
            </Card>
          ) : (
          <Card style={{ marginBottom: '1rem' }}>
            <CardContent className="p-4">
              {/* Total */}
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Toplam</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>
                  {totalEUR.toFixed(2)} &euro;
                </p>
              </div>

              {/* Currency Conversion Row */}
              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {currencyButtons.map(({ currency, symbol, color }) => {
                  const amount = convertAmount(currency)
                  const isSelected = selectedCurrency === currency
                  return (
                    <button
                      key={currency}
                      onClick={() => setSelectedCurrency(currency)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: isSelected ? `2px solid ${color}` : '2px solid #e5e7eb',
                        backgroundColor: isSelected ? `${color}10` : 'white',
                        cursor: 'pointer',
                        minWidth: '60px',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{symbol}</span>
                      <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                        {amount > 0 ? amount.toFixed(2) : '-'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Remaining */}
              <div style={{ textAlign: 'center', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
                <p style={{ color: '#6b7280', fontSize: '0.7rem' }}>Kalan</p>
                <p style={{ fontWeight: 600, color: '#1f2937' }}>
                  {convertAmount(selectedCurrency).toFixed(2)} {selectedCurrency}
                </p>
              </div>

              {/* Payment Method */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <Button
                  variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setPaymentMethod('CASH')}
                  style={paymentMethod === 'CASH' ? { backgroundColor: '#16a34a', color: 'white' } : {}}
                >
                  <Banknote className="h-4 w-4 mr-1" /> Nakit
                </Button>
                <Button
                  variant={paymentMethod === 'CREDIT_CARD' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  style={paymentMethod === 'CREDIT_CARD' ? { backgroundColor: '#2563eb', color: 'white' } : {}}
                >
                  <CreditCard className="h-4 w-4 mr-1" /> Kart
                </Button>
                <Button
                  variant={paymentMethod === 'TRANSFER' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  style={paymentMethod === 'TRANSFER' ? { backgroundColor: '#7c3aed', color: 'white' } : {}}
                >
                  <Building className="h-4 w-4 mr-1" /> Havale
                </Button>
              </div>

              {/* Submit */}
              <Button
                className="w-full"
                onClick={handlePaymentClick}
                disabled={loading}
                style={{ backgroundColor: '#16a34a', color: 'white', fontWeight: 700, fontSize: '1rem', height: '3rem' }}
              >
                {loading ? 'İşleniyor...' : 'Ödeme Al'}
              </Button>
            </CardContent>
          </Card>
          )}
        </>
      )}

      {/* Onay Modalı */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ödeme Onayı</p>
            <p style={{ color: '#6b7280', marginBottom: '0.25rem' }}>{customer?.name} {customer?.surname}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.25rem' }}>
              {convertAmount(selectedCurrency).toFixed(2)} {selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USD' ? '$' : selectedCurrency === 'GBP' ? '£' : selectedCurrency === 'RUB' ? '₽' : '₺'}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {paymentMethod === 'CASH' ? 'Nakit' : paymentMethod === 'CREDIT_CARD' ? 'Kart' : 'Havale'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Vazgeç</Button>
              <Button className="flex-1" onClick={handlePaymentConfirm} style={{ backgroundColor: '#16a34a', color: 'white' }}>Onayla</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
