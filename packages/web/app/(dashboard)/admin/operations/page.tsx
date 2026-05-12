'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Radio, Users, CheckCircle, Clock, Loader2, Eye, EyeOff, MapPin, Phone } from 'lucide-react'
import { api } from '@/lib/api'

interface Ticket {
  no: string; durum: string; saat: string; otel: string; bolge: string
  yolcu: number; cocuk: number; acente: string; irtibat: string; telefon: string; rest: string
}
interface TimeSlot { saat: string; kisi: number; tickets: Ticket[] }
interface Summary {
  totalPax: number; totalKisi: number; totalCocuk: number
  turBitti: number; ofiste: number; transferde: number
  ucusta: number; bekleyen: number; ulasilamadi: number; iptal: number
}
interface ProAgentData { date: string; summary: Summary; timeSlots: TimeSlot[] }

const durumCfg: Record<string, { label: string; bg: string; text: string; rowBg: string }> = {
  'Tur Bitti':          { label: 'Tur Bitti',    bg: 'bg-emerald-500', text: 'text-white',      rowBg: 'bg-emerald-50' },
  'Ofiste':             { label: 'Ofiste',       bg: 'bg-blue-500',    text: 'text-white',      rowBg: 'bg-blue-50' },
  'Transfer Sürecinde': { label: 'Transferde',   bg: 'bg-orange-500',  text: 'text-white',      rowBg: 'bg-orange-50' },
  'Uçusta':             { label: 'Uçusta',       bg: 'bg-violet-500',  text: 'text-white',      rowBg: 'bg-violet-50' },
  'Ulaşılamadı':        { label: 'Ulaşılamadı',  bg: 'bg-red-500',     text: 'text-white',      rowBg: 'bg-red-50' },
  'İptal':              { label: 'İptal',        bg: 'bg-red-600',     text: 'text-white',      rowBg: 'bg-red-50' },
  '-':                  { label: 'Bekliyor',     bg: 'bg-amber-400',   text: 'text-white',      rowBg: 'bg-amber-50' },
  '':                   { label: 'Bekliyor',     bg: 'bg-amber-400',   text: 'text-white',      rowBg: 'bg-amber-50' },
}

export default function OperationsPage() {
  const [data, setData] = useState<ProAgentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('today')

  const getDateLabel = () => {
    if (selectedDate === 'today') return 'Bugün'
    if (selectedDate === 'tomorrow') return 'Yarın'
    return selectedDate
  }

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const params = selectedDate !== 'today' ? `?date=${selectedDate}` : ''
      const res = await api.get(`/flights/operations/proagent${params}`)
      if (res.data.success) { setData(res.data.data); setLastUpdate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })) }
    } catch (e: any) { setError(e.response?.data?.message || 'ProAgent verisi alınamadı') }
    finally { setLoading(false) }
  }

  const filteredSlots = data?.timeSlots.map(slot => ({
    ...slot,
    tickets: hideDone ? slot.tickets.filter(t => t.durum !== 'Tur Bitti' && t.durum !== 'İptal') : slot.tickets,
  })).filter(slot => slot.tickets.length > 0) || []

  const siradakiSlots = data?.timeSlots
    .map(slot => {
      const pending = slot.tickets.filter(t => t.durum === '-' || t.durum === '' || t.durum === 'Transfer Sürecinde')
      return { saat: slot.saat, kisi: pending.reduce((s, t) => s + t.yolcu + t.cocuk, 0) }
    }).filter(s => s.kisi > 0) || []

  const s = data?.summary

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-600" />
            <h1 className="text-lg font-bold">Operasyon</h1>
            {lastUpdate && <span className="text-xs text-gray-400">({lastUpdate})</span>}
          </div>
          <div className="flex gap-2">
            {data && (
              <Button size="sm" variant={hideDone ? 'default' : 'outline'} onClick={() => setHideDone(!hideDone)} className="text-xs h-8">
                {hideDone ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
                {hideDone ? 'Göster' : 'Gizle'}
              </Button>
            )}
            <Button onClick={fetchData} disabled={loading} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Güncelle
            </Button>
          </div>
        </div>
        {/* Tarih seçici */}
        <div className="flex gap-1.5 overflow-x-auto">
          {['today', 'tomorrow', 'dayafter'].map(key => {
            const now = new Date()
            let label = 'Bugün'
            let dateStr = key
            if (key === 'tomorrow') {
              label = 'Yarın'
              const d = new Date(now); d.setDate(d.getDate() + 1)
              dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
            } else if (key === 'dayafter') {
              label = 'Öbür Gün'
              const d = new Date(now); d.setDate(d.getDate() + 2)
              dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
            }
            return (
              <Button key={key} size="sm" variant={selectedDate === (key === 'today' ? 'today' : dateStr) ? 'default' : 'outline'}
                onClick={() => { setSelectedDate(key === 'today' ? 'today' : dateStr); setData(null) }}
                className="text-xs h-7 px-3"
              >{label}</Button>
            )
          })}
          <input type="date" className="text-xs h-7 border rounded px-2 bg-white"
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-')
                setSelectedDate(`${d}-${m}-${y}`)
                setData(null)
              }
            }}
          />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-700 text-sm rounded-lg p-3 font-medium">{error}</div>}

      {!data && !loading && !error && (
        <Card><CardContent className="py-10 text-center text-gray-400">
          <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Güncelle butonuna basın</p>
        </CardContent></Card>
      )}

      {data && s && (
        <>
          {/* Özet Kartları — canlı renkli */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-center text-white shadow-md">
              <Users className="h-5 w-5 mx-auto mb-1 opacity-80" />
              <div className="text-2xl font-black">{s.totalKisi}<span className="text-sm font-normal opacity-80">+{s.totalCocuk}ç</span></div>
              <div className="text-[11px] opacity-80">Toplam</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 text-center text-white shadow-md">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 opacity-80" />
              <div className="text-2xl font-black">{s.turBitti}</div>
              <div className="text-[11px] opacity-80">Tur Bitti</div>
            </div>
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-3 text-center text-white shadow-md">
              <Clock className="h-5 w-5 mx-auto mb-1 opacity-80" />
              <div className="text-2xl font-black">{s.bekleyen + s.transferde + s.ofiste + s.ucusta}</div>
              <div className="text-[11px] opacity-80">Kalan</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-3 text-center text-white shadow-md">
              <div className="text-[11px] opacity-80 mb-1">Sıradaki</div>
              {siradakiSlots.length > 0 ? (
                <div className="space-y-0.5">
                  {siradakiSlots.slice(0, 3).map(ss => (
                    <div key={ss.saat} className="text-sm">
                      <span className="font-black">{ss.saat}</span>
                      <span className="opacity-80 ml-1 text-xs">{ss.kisi} kişi</span>
                    </div>
                  ))}
                  {siradakiSlots.length > 3 && <div className="text-[10px] opacity-60">+{siradakiSlots.length - 3} saat daha</div>}
                </div>
              ) : (
                <div className="text-sm font-bold opacity-60">—</div>
              )}
            </div>
          </div>

          {/* Durum çipleri */}
          <div className="flex flex-wrap gap-1.5">
            {s.transferde > 0 && <span className="bg-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">Transferde {s.transferde}</span>}
            {s.ofiste > 0 && <span className="bg-blue-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">Ofiste {s.ofiste}</span>}
            {s.ucusta > 0 && <span className="bg-violet-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">Uçusta {s.ucusta}</span>}
            {s.bekleyen > 0 && <span className="bg-amber-400 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">Bekliyor {s.bekleyen}</span>}
            {s.ulasilamadi > 0 && <span className="bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">Ulaşılamadı {s.ulasilamadi}</span>}
            {s.iptal > 0 && <span className="bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">İptal {s.iptal}</span>}
          </div>

          {/* Saat Bazlı Liste */}
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-0">
              {filteredSlots.map((slot, slotIdx) => {
                const allDone = slot.tickets.every(t => t.durum === 'Tur Bitti' || t.durum === 'İptal')
                const slotKalan = slot.tickets.filter(t => t.durum !== 'Tur Bitti' && t.durum !== 'İptal').reduce((ss, t) => ss + t.yolcu + t.cocuk, 0)
                return (
                  <div key={slot.saat} className={slotIdx > 0 ? 'border-t-2 border-gray-200' : ''}>
                    {/* Saat başlığı */}
                    <div className={`flex items-center justify-between px-4 py-2.5 ${allDone ? 'bg-gray-100' : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white'}`}>
                      <div className="flex items-center gap-3">
                        <Clock className={`h-4 w-4 ${allDone ? 'text-gray-400' : 'text-white opacity-60'}`} />
                        <span className={`text-lg font-black ${allDone ? 'text-gray-400' : ''}`}>{slot.saat}</span>
                        <span className={`text-sm ${allDone ? 'text-gray-400' : 'opacity-70'}`}>{slot.kisi} kişi</span>
                      </div>
                      {allDone ? (
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Tamam</span>
                      ) : slotKalan > 0 ? (
                        <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">{slotKalan} bekliyor</span>
                      ) : null}
                    </div>
                    {/* Biletler */}
                    <div className="divide-y divide-gray-100">
                      {slot.tickets.map((t, i) => {
                        const cfg = durumCfg[t.durum] || durumCfg['-']
                        const isIptal = t.durum === 'İptal'
                        return (
                          <div key={i} className={`px-4 py-2.5 ${cfg.rowBg} ${isIptal ? 'opacity-50' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold ${isIptal ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                  {t.otel}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="font-semibold text-gray-600">{t.bolge}</span>
                                  <span>·</span>
                                  <span className="truncate">{t.acente}</span>
                                </div>
                                {(t.irtibat || t.telefon) && (
                                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    <span>{t.irtibat} {t.telefon}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <div className="text-base font-black text-gray-800">
                                  {t.yolcu}{t.cocuk > 0 && <span className="text-orange-500 text-sm">+{t.cocuk}ç</span>}
                                </div>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                                  {cfg.label}
                                </span>
                                {t.rest && t.rest !== '0' && (
                                  <span className="text-[11px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded">{t.rest}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
