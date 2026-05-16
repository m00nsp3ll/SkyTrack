'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, currencyApi } from '@/lib/api'
import { QrCode, Search, X, Banknote, CreditCard, Building } from 'lucide-react'

interface Sale { id: string; itemName: string; totalPrice: number; totalAmountEUR: number; paymentStatus: string; createdAt: string }
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
  const [showConfirm, setShowConfirm] = useState(false)
  const [payingId, setPayingId] = useState(false)
  const scannerRef = useRef<any>(null)

  const fetchRates = useCallback(async () => {
    try { const r = await currencyApi.getRates(); setRates(r.data?.data?.rates || r.data?.rates || {}) } catch {}
  }, [])

  const lookupCustomer = useCallback(async (displayId: string) => {
    setError(''); setCustomer(null); setSales([])
    if (!displayId.trim()) return
    try {
      setLoading(true)
      const res = await api.get(`/customers/public/${displayId.trim()}`)
      setCustomer(res.data?.data || res.data)
      try {
        const d = await api.get(`/customers/${displayId.trim()}`)
        const all = d.data?.data?.sales || []
        setSales(all.filter((s: any) => s.itemType === 'Foto/Video' || s.itemType === 'MEDIA' || s.itemName?.includes('Foto') || s.itemName?.includes('Video') || s.itemName?.includes('video')))
      } catch {}
      await fetchRates()
    } catch { setError('Müşteri bulunamadı') }
    finally { setLoading(false) }
  }, [fetchRates])

  const handleScan = useCallback(async () => {
    if (scanning) { if (scannerRef.current) try { await scannerRef.current.stop() } catch {}; scannerRef.current = null; setScanning(false); return }
    setScanning(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      scannerRef.current = new Html5Qrcode('qr-pay')
      await scannerRef.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (text: string) => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}); scannerRef.current = null; setScanning(false); const m = text.match(/\/c\/([A-Za-z0-9]+)/); const id = m ? m[1] : text; setManualId(id); lookupCustomer(id) }, () => {})
    } catch { setScanning(false); setError('Kamera erişimi sağlanamadı') }
  }, [lookupCustomer, scanning])

  const convert = (eur: number, c: Currency): number => {
    if (c === 'EUR') return eur
    const r = rates[`EUR_${c}`]; if (!r) return 0
    return Math.round(eur * r.sellRate * 100) / 100
  }

  const unpaid = sales.filter(s => s.paymentStatus === 'UNPAID')
  const totalDebt = unpaid.reduce((s, x) => s + (x.totalAmountEUR || x.totalPrice), 0)

  const handlePay = async () => {
    setShowConfirm(false); setPayingId(true)
    try {
      for (const sale of unpaid) {
        await api.post(`/sales/${sale.id}/pay`, { paymentMethod, currency: selectedCurrency })
      }
      setSales(prev => prev.map(s => unpaid.find(u => u.id === s.id) ? { ...s, paymentStatus: 'PAID' } : s))
    } catch (e: any) { alert(e.response?.data?.message || 'Ödeme başarısız') }
    finally { setPayingId(false) }
  }

  const cBtns: { c: Currency; s: string; cl: string }[] = [
    { c: 'EUR', s: '€', cl: '#2563eb' }, { c: 'USD', s: '$', cl: '#16a34a' }, { c: 'GBP', s: '£', cl: '#7c3aed' }, { c: 'RUB', s: '₽', cl: '#dc2626' }, { c: 'TRY', s: '₺', cl: '#ea580c' },
  ]

  return (
    <div style={{ padding: '0.75rem', maxWidth: 480, margin: '0 auto' }}>
      {/* Arama */}
      <Card style={{ marginBottom: '0.75rem' }}>
        <CardContent style={{ padding: '0.75rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Foto/Video Tahsilat</p>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <Input placeholder="Müşteri ID" value={manualId} onChange={e => setManualId(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupCustomer(manualId)} style={{ flex: 1, height: 40 }} />
            <Button size="icon" onClick={() => lookupCustomer(manualId)} disabled={loading} style={{ background: '#2563eb', color: '#fff', width: 40, height: 40 }}><Search className="h-4 w-4" /></Button>
            <Button size="icon" onClick={handleScan} style={{ background: scanning ? '#dc2626' : '#7c3aed', color: '#fff', width: 40, height: 40 }}>{scanning ? <X className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}</Button>
          </div>
          {scanning && <div id="qr-pay" style={{ borderRadius: 8, overflow: 'hidden', marginTop: 6 }} />}
          {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 4 }}>{error}</p>}
        </CardContent>
      </Card>

      {customer && (
        <>
          {/* Müşteri */}
          <Card style={{ marginBottom: '0.75rem', borderLeft: '4px solid #7c3aed' }}>
            <CardContent style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{customer.firstName} {customer.lastName}</span>
                  <span style={{ color: '#7c3aed', fontSize: '0.8rem', marginLeft: 6 }}>{customer.displayId}</span>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>Pilot: {customer.pilot?.name || '-'} · {customer.media?.fileCount || 0} dosya</p>
                </div>
                <button onClick={() => { setCustomer(null); setSales([]); setManualId('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X style={{ width: 18, height: 18, color: '#9ca3af' }} /></button>
              </div>
              {totalDebt === 0 && sales.length > 0 && <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.8rem', marginTop: 4 }}>✅ Ödeme tamamlandı</p>}
              {sales.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: 4 }}>Müşterinin ödemesi yok</p>}
            </CardContent>
          </Card>

          {/* Satış listesi — kompakt */}
          {sales.length > 0 && (
            <Card style={{ marginBottom: '0.75rem' }}>
              <CardContent style={{ padding: '0.75rem' }}>
                {sales.map(sale => {
                  const paid = sale.paymentStatus === 'PAID'
                  const eur = sale.totalAmountEUR || sale.totalPrice
                  return (
                    <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sale.itemName}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.7rem', marginLeft: 6 }}>
                          {new Date(sale.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700 }}>€{eur.toFixed(2)}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: paid ? '#dcfce7' : '#fef2f2', color: paid ? '#16a34a' : '#dc2626' }}>
                          {paid ? 'Ödendi' : 'Bekliyor'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Tahsilat paneli */}
          {unpaid.length > 0 && (
            <Card>
              <CardContent style={{ padding: '0.75rem' }}>
                {/* Toplam */}
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.7rem' }}>Toplam Borç</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800 }}>{totalDebt.toFixed(2)} €</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', fontSize: '0.7rem', color: '#6b7280' }}>
                    <span>${convert(totalDebt, 'USD').toFixed(2)}</span>
                    <span>£{convert(totalDebt, 'GBP').toFixed(2)}</span>
                    <span>₽{convert(totalDebt, 'RUB').toFixed(0)}</span>
                    <span>₺{convert(totalDebt, 'TRY').toFixed(2)}</span>
                  </div>
                </div>

                {/* Para birimi */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '0.5rem' }}>
                  {cBtns.map(({ c, s, cl }) => (
                    <button key={c} onClick={() => setSelectedCurrency(c)} style={{
                      width: 52, height: 52, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: selectedCurrency === c ? `2.5px solid ${cl}` : '2px solid #e5e7eb', background: selectedCurrency === c ? `${cl}15` : '#fff', cursor: 'pointer',
                    }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: cl }}>{s}</span>
                      <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>{convert(totalDebt, c).toFixed(c === 'RUB' ? 0 : 2)}</span>
                    </button>
                  ))}
                </div>

                {/* Ödeme yöntemi */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: '0.75rem' }}>
                  {([['CASH', 'Nakit', '#16a34a', Banknote], ['CREDIT_CARD', 'Kart', '#2563eb', CreditCard], ['TRANSFER', 'Havale', '#7c3aed', Building]] as const).map(([m, l, cl, Icon]) => (
                    <button key={m} onClick={() => setPaymentMethod(m)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                      border: paymentMethod === m ? `2px solid ${cl}` : '2px solid #e5e7eb',
                      background: paymentMethod === m ? `${cl}15` : '#fff',
                      color: paymentMethod === m ? cl : '#6b7280',
                    }}>
                      <Icon style={{ width: 16, height: 16 }} /> {l}
                    </button>
                  ))}
                </div>

                {/* ÖDEME AL */}
                <button onClick={() => setShowConfirm(true)} disabled={payingId} style={{
                  width: '100%', padding: '0.9rem', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
                  fontWeight: 800, fontSize: '1.1rem', opacity: payingId ? 0.5 : 1,
                }}>
                  {payingId ? 'İşleniyor...' : `Ödeme Al — ${convert(totalDebt, selectedCurrency).toFixed(selectedCurrency === 'RUB' ? 0 : 2)} ${cBtns.find(b => b.c === selectedCurrency)?.s}`}
                </button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Onay */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 340, width: '100%', textAlign: 'center' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Ödeme Onayı</p>
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{customer?.firstName} {customer?.lastName}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', margin: '0.5rem 0' }}>
              {convert(totalDebt, selectedCurrency).toFixed(selectedCurrency === 'RUB' ? 0 : 2)} {cBtns.find(b => b.c === selectedCurrency)?.s}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '1rem' }}>{paymentMethod === 'CASH' ? 'Nakit' : paymentMethod === 'CREDIT_CARD' ? 'Kart' : 'Havale'}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Vazgeç</Button>
              <Button className="flex-1" onClick={handlePay} style={{ background: '#16a34a', color: '#fff' }}>Onayla</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
