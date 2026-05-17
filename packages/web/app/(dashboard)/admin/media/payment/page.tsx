'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, currencyApi } from '@/lib/api'
import { QrCode, Search, X, Banknote, CreditCard, Building, Check } from 'lucide-react'

interface Sale {
  id: string
  itemName: string
  totalPrice: number
  totalAmountEUR: number
  paymentStatus: string
  createdAt: string
}

interface CollectedPayment {
  id: string
  currency: Currency
  amount: number
  method: PaymentMethod
  eurEquivalent: number
  rate: number
}

type Currency = 'EUR' | 'USD' | 'GBP' | 'RUB' | 'TRY'
type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'TRANSFER'
type Rates = Record<string, { buyRate: number; sellRate: number }>

const CURRENCIES: { value: Currency; symbol: string; color: string }[] = [
  { value: 'EUR', symbol: '€', color: '#2563eb' },
  { value: 'USD', symbol: '$', color: '#16a34a' },
  { value: 'GBP', symbol: '£', color: '#7c3aed' },
  { value: 'RUB', symbol: '₽', color: '#dc2626' },
  { value: 'TRY', symbol: '₺', color: '#ea580c' },
]

export default function MediaPaymentPage() {
  const [manualId, setManualId] = useState('')
  const [customer, setCustomer] = useState<any>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [rates, setRates] = useState<Rates>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<any>(null)

  // Payment state
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('EUR')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [payAmount, setPayAmount] = useState('')
  const [collectedPayments, setCollectedPayments] = useState<CollectedPayment[]>([])
  const [processing, setProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<{ amount: number; currency: Currency; method: PaymentMethod; eurEquivalent: number; rate: number } | null>(null)
  const [success, setSuccess] = useState(false)
  const payInputRef = useRef<HTMLInputElement>(null)

  // --- Currency helpers ---
  const getRate = (currency: Currency): number => {
    if (currency === 'EUR') return 1
    const rate = rates[`EUR_${currency}`]?.sellRate || rates[currency]?.buyRate
    return rate || 1
  }

  const convertToEUR = (amount: number, fromCurrency: Currency): number => {
    if (fromCurrency === 'EUR') return amount
    const rate = getRate(fromCurrency)
    return amount / rate
  }

  const convertFromEUR = (eurAmount: number, toCurrency: Currency): number => {
    if (toCurrency === 'EUR') return eurAmount
    const rate = getRate(toCurrency)
    return eurAmount * rate
  }

  const getCurrencySymbol = (c: Currency): string => {
    return CURRENCIES.find(x => x.value === c)?.symbol || c
  }

  const formatAmount = (amount: number, currency: Currency): string => {
    if (currency === 'RUB') return amount.toFixed(0)
    return amount.toFixed(2)
  }

  // --- Data fetching ---
  const fetchRates = useCallback(async () => {
    try {
      const r = await currencyApi.getRates()
      const data = r.data?.data || r.data
      setRates(data?.rates || {})
    } catch {}
  }, [])

  const lookupCustomer = useCallback(async (displayId: string) => {
    setError('')
    setCustomer(null)
    setSales([])
    setCollectedPayments([])
    setSuccess(false)
    setPendingPayment(null)
    if (!displayId.trim()) return
    try {
      setLoading(true)
      const res = await api.get(`/customers/public/${displayId.trim()}`)
      setCustomer(res.data?.data || res.data)
      try {
        const d = await api.get(`/customers/${displayId.trim()}`)
        const all = d.data?.data?.sales || []
        setSales(all.filter((s: any) =>
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
      if (scannerRef.current) try { await scannerRef.current.stop() } catch {}
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
          if (scannerRef.current) scannerRef.current.stop().catch(() => {})
          scannerRef.current = null
          setScanning(false)
          const m = text.match(/\/c\/([A-Za-z0-9]+)/)
          const id = m ? m[1] : text
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

  // --- Payment calculations ---
  const unpaid = sales.filter(s => s.paymentStatus === 'UNPAID')
  const totalDebtEUR = unpaid.reduce((s, x) => s + (x.totalAmountEUR || x.totalPrice), 0)
  const paidTotalEUR = collectedPayments.reduce((sum, e) => sum + e.eurEquivalent, 0)
  const remainingEUR = Math.max(0, totalDebtEUR - paidTotalEUR)

  // Handle "Tahsil Et" button — show confirmation modal
  const handleCollect = () => {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    const rate = getRate(selectedCurrency)
    const eurEquivalent = convertToEUR(amount, selectedCurrency)
    setPendingPayment({ amount, currency: selectedCurrency, method: paymentMethod, eurEquivalent, rate })
    setShowConfirm(true)
  }

  // Confirm payment in modal
  const handleConfirmPayment = async () => {
    if (!pendingPayment) return
    setShowConfirm(false)

    const newPayment: CollectedPayment = {
      id: String(Date.now()),
      ...pendingPayment,
    }
    const updatedPayments = [...collectedPayments, newPayment]
    setCollectedPayments(updatedPayments)
    setPendingPayment(null)

    const newPaidTotal = updatedPayments.reduce((sum, e) => sum + e.eurEquivalent, 0)
    const newRemaining = Math.max(0, totalDebtEUR - newPaidTotal)

    // If fully paid, execute API call
    if (newRemaining < 0.01) {
      setProcessing(true)
      try {
        for (const sale of unpaid) {
          await api.post(`/sales/${sale.id}/pay`, {
            paymentMethod: updatedPayments[0].method,
            currency: updatedPayments[0].currency,
            amount: updatedPayments[0].amount,
          })
        }
        setSales(prev => prev.map(s =>
          unpaid.find(u => u.id === s.id) ? { ...s, paymentStatus: 'PAID' } : s
        ))
        setSuccess(true)
        setPayAmount('')
      } catch (e: any) {
        alert(e.response?.data?.message || 'Ödeme başarısız')
      } finally {
        setProcessing(false)
      }
    } else {
      // Show remaining in selected currency
      const converted = convertFromEUR(newRemaining, selectedCurrency)
      setPayAmount(formatAmount(Math.ceil(converted * 100) / 100, selectedCurrency))
    }
  }

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency)
    if (remainingEUR > 0.01) {
      const converted = convertFromEUR(remainingEUR, currency)
      setPayAmount(formatAmount(Math.ceil(converted * 100) / 100, currency))
    }
    setTimeout(() => payInputRef.current?.focus(), 50)
  }

  return (
    <div style={{ padding: '0.75rem', maxWidth: 480, margin: '0 auto' }}>
      {/* Search */}
      <Card style={{ marginBottom: '0.75rem' }}>
        <CardContent style={{ padding: '0.75rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Foto/Video Tahsilat</p>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <Input
              placeholder="Müşteri ID"
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupCustomer(manualId)}
              style={{ flex: 1, height: 40 }}
            />
            <Button size="icon" onClick={() => lookupCustomer(manualId)} disabled={loading}
              style={{ background: '#2563eb', color: '#fff', width: 40, height: 40 }}>
              <Search className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={handleScan}
              style={{ background: scanning ? '#dc2626' : '#7c3aed', color: '#fff', width: 40, height: 40 }}>
              {scanning ? <X className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
            </Button>
          </div>
          {scanning && <div id="qr-pay" style={{ borderRadius: 8, overflow: 'hidden', marginTop: 6 }} />}
          {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 4 }}>{error}</p>}
        </CardContent>
      </Card>

      {customer && (
        <>
          {/* Customer info */}
          <Card style={{ marginBottom: '0.75rem', borderLeft: '4px solid #7c3aed' }}>
            <CardContent style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{customer.firstName} {customer.lastName}</span>
                  <span style={{ color: '#7c3aed', fontSize: '0.8rem', marginLeft: 6 }}>{customer.displayId}</span>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    Pilot: {customer.pilot?.name || customer.assignedPilot?.name || '-'} · {customer.media?.fileCount || 0} dosya
                  </p>
                </div>
                <button onClick={() => { setCustomer(null); setSales([]); setManualId(''); setCollectedPayments([]); setSuccess(false) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X style={{ width: 18, height: 18, color: '#9ca3af' }} />
                </button>
              </div>
              {success && <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.8rem', marginTop: 4 }}>✅ Ödeme tamamlandı — müşteri dosyalarını indirebilir</p>}
              {!success && totalDebtEUR === 0 && sales.length > 0 && <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.8rem', marginTop: 4 }}>✅ Tüm ödemeler alındı</p>}
              {sales.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: 4 }}>Müşterinin foto/video satışı yok</p>}
            </CardContent>
          </Card>

          {/* Sales list */}
          {sales.length > 0 && (
            <Card style={{ marginBottom: '0.75rem' }}>
              <CardContent style={{ padding: '0.75rem' }}>
                {sales.map(sale => {
                  const paid = sale.paymentStatus === 'PAID'
                  const eur = sale.totalAmountEUR || sale.totalPrice
                  return (
                    <div key={sale.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.4rem 0', borderBottom: '1px solid #f3f4f6'
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sale.itemName}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.7rem', marginLeft: 6 }}>
                          {new Date(sale.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700 }}>€{eur.toFixed(2)}</span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: paid ? '#dcfce7' : '#fef2f2',
                          color: paid ? '#16a34a' : '#dc2626'
                        }}>
                          {paid ? 'Ödendi' : 'Bekliyor'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Payment panel */}
          {unpaid.length > 0 && !success && (
            <Card>
              <CardContent style={{ padding: '0.75rem' }}>
                {/* Debt / Remaining display */}
                <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
                  {collectedPayments.length === 0 ? (
                    <>
                      <p style={{ color: '#6b7280', fontSize: '0.7rem' }}>Toplam Borç</p>
                      <p style={{ fontSize: '2rem', fontWeight: 800 }}>{totalDebtEUR.toFixed(2)} €</p>
                    </>
                  ) : (
                    <>
                      <p style={{ color: '#6b7280', fontSize: '0.7rem' }}>Kalan Borç</p>
                      <p style={{ fontSize: '2rem', fontWeight: 800, color: remainingEUR <= 0.01 ? '#16a34a' : '#dc2626' }}>
                        {remainingEUR.toFixed(2)} €
                      </p>
                    </>
                  )}
                  {/* Other currencies */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', fontSize: '0.7rem', color: '#6b7280', marginTop: 2 }}>
                    {CURRENCIES.filter(c => c.value !== 'EUR').map(c => {
                      const base = collectedPayments.length === 0 ? totalDebtEUR : remainingEUR
                      return (
                        <span key={c.value}>{c.symbol}{formatAmount(convertFromEUR(base, c.value), c.value)}</span>
                      )
                    })}
                  </div>
                </div>

                {/* Collected payments list */}
                {collectedPayments.length > 0 && (
                  <div style={{ marginBottom: '0.6rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.4rem' }}>
                    {collectedPayments.map(entry => (
                      <div key={entry.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.3rem 0.4rem', marginBottom: 3, borderRadius: 6,
                        background: '#f0fdf4', border: '1px solid #bbf7d0'
                      }}>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 700 }}>
                            {formatAmount(entry.amount, entry.currency)} {getCurrencySymbol(entry.currency)}
                          </span>
                          <span style={{ color: '#6b7280', marginLeft: 6, fontSize: '0.7rem' }}>
                            {entry.method === 'CASH' ? 'Nakit' : entry.method === 'CREDIT_CARD' ? 'Kart' : 'Havale'}
                          </span>
                          {entry.currency !== 'EUR' && (
                            <span style={{ color: '#9ca3af', marginLeft: 4, fontSize: '0.65rem' }}>
                              (kur: {entry.rate.toFixed(2)} → €{entry.eurEquivalent.toFixed(2)})
                            </span>
                          )}
                        </div>
                        <Check style={{ width: 14, height: 14, color: '#16a34a' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Amount input + currency + method */}
                {remainingEUR > 0.01 && (
                  <>
                    {/* Editable amount */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          ref={payInputRef}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          placeholder="0.00"
                          style={{
                            width: '100%', height: 56, borderRadius: 12,
                            border: `2px solid ${CURRENCIES.find(c => c.value === selectedCurrency)?.color || '#e5e7eb'}`,
                            fontSize: '1.5rem', fontWeight: 700, textAlign: 'center',
                            outline: 'none', padding: '0 3rem',
                          }}
                        />
                        <span style={{
                          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                          fontSize: '1.2rem', fontWeight: 800,
                          color: CURRENCIES.find(c => c.value === selectedCurrency)?.color || '#6b7280'
                        }}>
                          {getCurrencySymbol(selectedCurrency)}
                        </span>
                      </div>
                    </div>

                    {/* Currency buttons */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '0.5rem' }}>
                      {CURRENCIES.map(({ value, symbol, color }) => {
                        const converted = convertFromEUR(remainingEUR, value)
                        return (
                          <button key={value} onClick={() => handleCurrencySelect(value)} style={{
                            width: 56, height: 56, borderRadius: 10, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            border: selectedCurrency === value ? `2.5px solid ${color}` : '2px solid #e5e7eb',
                            background: selectedCurrency === value ? `${color}15` : '#fff',
                          }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{symbol}</span>
                            <span style={{ fontSize: '0.55rem', color: '#6b7280' }}>
                              {formatAmount(converted, value)}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Payment method */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: '0.75rem' }}>
                      {([
                        ['CASH', 'Nakit', '#16a34a', Banknote],
                        ['CREDIT_CARD', 'Kart', '#2563eb', CreditCard],
                        ['TRANSFER', 'Havale', '#7c3aed', Building],
                      ] as const).map(([m, l, cl, Icon]) => (
                        <button key={m} onClick={() => setPaymentMethod(m)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          padding: '0.5rem', borderRadius: 8, cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.8rem',
                          border: paymentMethod === m ? `2px solid ${cl}` : '2px solid #e5e7eb',
                          background: paymentMethod === m ? `${cl}15` : '#fff',
                          color: paymentMethod === m ? cl : '#6b7280',
                        }}>
                          <Icon style={{ width: 16, height: 16 }} /> {l}
                        </button>
                      ))}
                    </div>

                    {/* Tahsil Et button */}
                    <button onClick={handleCollect} disabled={!payAmount || parseFloat(payAmount) <= 0} style={{
                      width: '100%', padding: '0.9rem', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
                      fontWeight: 800, fontSize: '1.1rem',
                      opacity: (!payAmount || parseFloat(payAmount) <= 0) ? 0.5 : 1,
                    }}>
                      Tahsil Et — {payAmount || '0'} {getCurrencySymbol(selectedCurrency)}
                    </button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Confirmation modal */}
      {showConfirm && pendingPayment && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '1rem'
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '1.5rem',
            maxWidth: 360, width: '100%', textAlign: 'center'
          }}>
            <p style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1.1rem' }}>Tahsilat Onayı</p>

            <div style={{ margin: '0.75rem 0', padding: '0.75rem', background: '#f9fafb', borderRadius: 10 }}>
              {/* Amount in original currency */}
              <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {formatAmount(pendingPayment.amount, pendingPayment.currency)} {getCurrencySymbol(pendingPayment.currency)}
              </p>

              {/* Exchange rate calculation */}
              {pendingPayment.currency !== 'EUR' && (
                <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
                  <p>Döviz Kuru: 1€ = {pendingPayment.rate.toFixed(4)} {getCurrencySymbol(pendingPayment.currency)}</p>
                  <p style={{ marginTop: 4 }}>
                    {formatAmount(pendingPayment.amount, pendingPayment.currency)} {getCurrencySymbol(pendingPayment.currency)} ÷ {pendingPayment.rate.toFixed(4)} = <strong style={{ color: '#16a34a' }}>€{pendingPayment.eurEquivalent.toFixed(2)}</strong>
                  </p>
                </div>
              )}

              {/* Method */}
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                Yöntem: {pendingPayment.method === 'CASH' ? 'Nakit' : pendingPayment.method === 'CREDIT_CARD' ? 'Kredi Kartı' : 'Havale'}
              </p>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
              <strong>€{pendingPayment.eurEquivalent.toFixed(2)}</strong> tahsil edilecek. Onaylıyor musunuz?
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" className="flex-1" onClick={() => { setShowConfirm(false); setPendingPayment(null) }}>
                Vazgeç
              </Button>
              <Button className="flex-1" onClick={handleConfirmPayment} disabled={processing}
                style={{ background: '#16a34a', color: '#fff' }}>
                {processing ? 'İşleniyor...' : 'Onayla'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
