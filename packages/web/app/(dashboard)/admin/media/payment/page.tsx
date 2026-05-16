'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, currencyApi } from '@/lib/api'
import { QrCode, CheckCircle, Search, X, Banknote, CreditCard, Building, SwitchCamera } from 'lucide-react'

interface Sale {
  id: string
  itemName: string
  totalPrice: number
  totalAmountEUR: number
  paymentStatus: string
  createdAt: string
}

type Currency = 'EUR' | 'USD' | 'GBP' | 'RUB' | 'TRY'
type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'TRANSFER'
type Rates = Record<string, { buyRate: number; sellRate: number }>

export default function MediaPaymentPage() {
  const [manualId, setManualId] = useState('')
  const [customer, setCustomer] = useState<any>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [rates, setRates] = useState<Rates>({})
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('EUR')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [showConfirm, setShowConfirm] = useState<Sale | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const scannerRef = useRef<any>(null)

  const fetchRates = useCallback(async () => {
    try {
      const res = await currencyApi.getRates()
      setRates(res.data?.data?.rates || res.data?.rates || {})
    } catch {}
  }, [])

  const lookupCustomer = useCallback(async (displayId: string) => {
    setError('')
    setCustomer(null)
    setSales([])
    if (!displayId.trim()) return
    try {
      setLoading(true)
      // Müşteri bilgisi
      const res = await api.get(`/customers/public/${displayId.trim()}`)
      const data = res.data?.data || res.data
      setCustomer(data)
      // Müşteri detay sayfasından satışları çek (doğru müşteriye ait)
      try {
        const detailRes = await api.get(`/customers/${data.displayId || displayId.trim()}`)
        const custDetail = detailRes.data?.data
        const allSales = custDetail?.sales || []
        // Sadece Foto/Video satışları
        setSales(allSales.filter((s: any) =>
          s.itemType === 'Foto/Video' || s.itemType === 'MEDIA' ||
          s.itemName?.includes('Foto') || s.itemName?.includes('Video') || s.itemName?.includes('video')
        ))
      } catch {}

      await fetchRates()
    } catch {
      setError('Müşteri bulunamadı')
    } finally {
      setLoading(false)
    }
  }, [fetchRates])

  const handleScan = useCallback(async () => {
    if (scanning) {
      if (scannerRef.current) { try { await scannerRef.current.stop() } catch {} }
      scannerRef.current = null
      setScanning(false)
      return
    }
    setScanning(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      scannerRef.current = new Html5Qrcode('qr-pay')
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text: string) => {
          if (scannerRef.current) { scannerRef.current.stop().catch(() => {}) }
          scannerRef.current = null
          setScanning(false)
          const match = text.match(/\/c\/([A-Za-z0-9]+)/)
          const id = match ? match[1] : text
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

  const convertAmount = (eur: number, currency: Currency): number => {
    if (currency === 'EUR') return eur
    const rate = rates[`EUR_${currency}`]
    if (!rate) return 0
    return Math.round(eur * rate.sellRate * 100) / 100
  }

  const handlePaySale = async (sale: Sale) => {
    setPayingId(sale.id)
    try {
      await api.post(`/sales/${sale.id}/pay`, {
        paymentMethod,
        currency: selectedCurrency,
      })
      // Satış listesini güncelle
      setSales(prev => prev.map(s => s.id === sale.id ? { ...s, paymentStatus: 'PAID' } : s))
      setShowConfirm(null)
    } catch (e: any) {
      alert(e.response?.data?.message || 'Ödeme işlemi başarısız')
    } finally {
      setPayingId(null)
    }
  }

  const unpaidSales = sales.filter(s => s.paymentStatus === 'UNPAID')
  const totalDebt = unpaidSales.reduce((s, sale) => s + (sale.totalAmountEUR || sale.totalPrice), 0)

  const currencyButtons: { c: Currency; sym: string; color: string }[] = [
    { c: 'EUR', sym: '€', color: '#2563eb' },
    { c: 'USD', sym: '$', color: '#16a34a' },
    { c: 'GBP', sym: '£', color: '#7c3aed' },
    { c: 'RUB', sym: '₽', color: '#dc2626' },
    { c: 'TRY', sym: '₺', color: '#ea580c' },
  ]

  const resetForm = () => {
    setManualId('')
    setCustomer(null)
    setSales([])
    setError('')
    setSelectedCurrency('EUR')
    setPaymentMethod('CASH')
    setShowConfirm(null)
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Foto/Video Tahsilat</h1>

      {/* Müşteri Arama */}
      <Card style={{ marginBottom: '1rem' }}>
        <CardContent className="p-4">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Input
              placeholder="Müşteri ID"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookupCustomer(manualId)}
              style={{ flex: 1 }}
            />
            <Button size="icon" onClick={() => lookupCustomer(manualId)} disabled={loading} style={{ background: '#2563eb', color: '#fff' }}>
              <Search className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={handleScan} style={{ background: scanning ? '#dc2626' : '#7c3aed', color: '#fff' }}>
              {scanning ? <X className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
            </Button>
          </div>
          {scanning && <div id="qr-pay" style={{ borderRadius: 8, overflow: 'hidden', marginTop: 8 }} />}
          {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
        </CardContent>
      </Card>

      {/* Müşteri Bilgisi */}
      {customer && (
        <>
          <Card style={{ marginBottom: '1rem', borderLeft: '4px solid #7c3aed', background: '#faf5ff' }}>
            <CardContent className="p-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{customer.firstName} {customer.lastName}</p>
                  <p style={{ color: '#7c3aed', fontSize: '0.85rem' }}>{customer.displayId}</p>
                  <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>Pilot: {customer.pilot?.name || '-'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>{customer.media?.fileCount || 0} dosya</p>
                  <Button variant="ghost" size="sm" onClick={resetForm} style={{ padding: '0.25rem' }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {totalDebt > 0 && (
                <div style={{ background: '#fef9c3', borderRadius: 8, padding: '0.5rem 0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                  <span style={{ color: '#92400e', fontWeight: 700 }}>Borç: €{totalDebt.toFixed(2)}</span>
                </div>
              )}
              {totalDebt === 0 && sales.length > 0 && (
                <div style={{ background: '#dcfce7', borderRadius: 8, padding: '0.5rem 0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ Ödeme tamamlandı</span>
                </div>
              )}
              {sales.length === 0 && (
                <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '0.5rem 0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ color: '#6b7280' }}>Müşterinin ödemesi yok</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Satış Geçmişi */}
          {sales.length > 0 && (
            <Card style={{ marginBottom: '1rem' }}>
              <CardContent className="p-4">
                <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>📋 Satış Geçmişi ({sales.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {sales.map(sale => {
                    const isPaid = sale.paymentStatus === 'PAID'
                    const eur = sale.totalAmountEUR || sale.totalPrice
                    return (
                      <div key={sale.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.75rem', borderRadius: 10,
                        background: isPaid ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${isPaid ? '#bbf7d0' : '#fecaca'}`,
                      }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sale.itemName}</p>
                          <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {new Date(sale.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>€{eur.toFixed(2)}</span>
                          {isPaid ? (
                            <span style={{ background: '#16a34a', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>Ödendi</span>
                          ) : (
                            <Button size="sm" onClick={() => setShowConfirm(sale)}
                              style={{ background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: 6 }}>
                              Ödeme Al
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tahsilat Paneli — borç varsa */}
          {unpaidSales.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>Toplam Borç</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: '#1f2937' }}>{totalDebt.toFixed(2)} €</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    <span>${convertAmount(totalDebt, 'USD').toFixed(2)}</span>
                    <span>£{convertAmount(totalDebt, 'GBP').toFixed(2)}</span>
                    <span>₽{convertAmount(totalDebt, 'RUB').toFixed(0)}</span>
                    <span>₺{convertAmount(totalDebt, 'TRY').toFixed(2)}</span>
                  </div>
                </div>

                {/* Para Birimi */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {currencyButtons.map(({ c, sym, color }) => (
                    <button key={c} onClick={() => setSelectedCurrency(c)}
                      style={{
                        width: 56, height: 56, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        border: selectedCurrency === c ? `2px solid ${color}` : '2px solid #e5e7eb',
                        background: selectedCurrency === c ? `${color}10` : '#fff', cursor: 'pointer',
                      }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{sym}</span>
                      <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>{convertAmount(totalDebt, c).toFixed(c === 'RUB' ? 0 : 2)}</span>
                    </button>
                  ))}
                </div>

                {/* Ödeme Yöntemi */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {([['CASH', 'Nakit', '#16a34a', Banknote], ['CREDIT_CARD', 'Kart', '#2563eb', CreditCard], ['TRANSFER', 'Havale', '#7c3aed', Building]] as const).map(([method, label, color, Icon]) => (
                    <Button key={method} variant="outline" className="flex-1" onClick={() => setPaymentMethod(method)}
                      style={{
                        borderColor: paymentMethod === method ? color : '#e5e7eb',
                        background: paymentMethod === method ? `${color}10` : '#fff',
                        color: paymentMethod === method ? color : '#6b7280',
                        fontWeight: paymentMethod === method ? 700 : 400,
                      }}>
                      <Icon className="h-4 w-4 mr-1" /> {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Onay Modalı */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ödeme Onayı</p>
            <p style={{ color: '#6b7280', marginBottom: '0.25rem' }}>{customer?.firstName} {customer?.lastName}</p>
            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{showConfirm.itemName}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.25rem' }}>
              {convertAmount(showConfirm.totalAmountEUR || showConfirm.totalPrice, selectedCurrency).toFixed(2)} {selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USD' ? '$' : selectedCurrency === 'GBP' ? '£' : selectedCurrency === 'RUB' ? '₽' : '₺'}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {paymentMethod === 'CASH' ? 'Nakit' : paymentMethod === 'CREDIT_CARD' ? 'Kart' : 'Havale'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(null)}>Vazgeç</Button>
              <Button className="flex-1" onClick={() => handlePaySale(showConfirm)} disabled={payingId === showConfirm.id}
                style={{ background: '#16a34a', color: '#fff' }}>
                {payingId === showConfirm.id ? 'İşleniyor...' : 'Onayla'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
