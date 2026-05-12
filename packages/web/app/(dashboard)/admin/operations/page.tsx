'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Radio, Users, CheckCircle, Clock, MapPin, Loader2, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'

interface Ticket {
  no: string
  durum: string
  saat: string
  otel: string
  bolge: string
  yolcu: number
  cocuk: number
  acente: string
  irtibat: string
  telefon: string
  rest: string
}

interface TimeSlot {
  saat: string
  kisi: number
  tickets: Ticket[]
}

interface Summary {
  totalPax: number
  totalKisi: number
  totalCocuk: number
  turBitti: number
  ofiste: number
  transferde: number
  ucusta: number
  bekleyen: number
  ulasilamadi: number
  iptal: number
}

interface ProAgentData {
  date: string
  summary: Summary
  timeSlots: TimeSlot[]
}

const durumStyle: Record<string, { label: string; cls: string }> = {
  'Tur Bitti': { label: 'Tur Bitti', cls: 'bg-green-100 text-green-700' },
  'Ofiste': { label: 'Ofiste', cls: 'bg-blue-100 text-blue-700' },
  'Transfer Sürecinde': { label: 'Transferde', cls: 'bg-orange-100 text-orange-700' },
  'Uçusta': { label: 'Uçusta', cls: 'bg-purple-100 text-purple-700' },
  'Ulaşılamadı': { label: 'Ulaşılamadı', cls: 'bg-red-100 text-red-700' },
  'İptal': { label: 'İptal', cls: 'bg-red-200 text-red-800 line-through' },
  '-': { label: 'Bekliyor', cls: 'bg-gray-100 text-gray-600' },
  '': { label: 'Bekliyor', cls: 'bg-gray-100 text-gray-600' },
}

export default function OperationsPage() {
  const [data, setData] = useState<ProAgentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/flights/operations/proagent')
      if (res.data.success) {
        setData(res.data.data)
        setLastUpdate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'ProAgent verisi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  const filteredSlots = data?.timeSlots.map(slot => ({
    ...slot,
    tickets: hideDone
      ? slot.tickets.filter(t => t.durum !== 'Tur Bitti' && t.durum !== 'İptal')
      : slot.tickets,
  })).filter(slot => slot.tickets.length > 0) || []

  const s = data?.summary

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-green-600" />
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
          <Button onClick={fetchData} disabled={loading} size="sm" variant="outline" className="h-8">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Güncelle
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      {!data && !loading && !error && (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Güncelle butonuna basın</p>
          </CardContent>
        </Card>
      )}

      {data && s && (
        <>
          {/* Özet */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-2 text-center">
                <Users className="h-4 w-4 mx-auto text-blue-600 mb-0.5" />
                <div className="text-xl font-bold text-blue-700">{s.totalKisi}<span className="text-xs font-normal text-blue-500">+{s.totalCocuk}ç</span></div>
                <div className="text-[10px] text-blue-500">Toplam ({s.totalPax})</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-2 text-center">
                <CheckCircle className="h-4 w-4 mx-auto text-green-600 mb-0.5" />
                <div className="text-xl font-bold text-green-700">{s.turBitti}</div>
                <div className="text-[10px] text-green-500">Tur Bitti</div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-2 text-center">
                <Clock className="h-4 w-4 mx-auto text-amber-600 mb-0.5" />
                <div className="text-xl font-bold text-amber-700">{s.bekleyen + s.transferde + s.ofiste + s.ucusta}</div>
                <div className="text-[10px] text-amber-500">Kalan</div>
              </CardContent>
            </Card>
          </div>

          {/* Durum detay */}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {s.transferde > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Transferde {s.transferde}</span>}
            {s.ofiste > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Ofiste {s.ofiste}</span>}
            {s.ucusta > 0 && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Uçusta {s.ucusta}</span>}
            {s.bekleyen > 0 && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Bekliyor {s.bekleyen}</span>}
            {s.ulasilamadi > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Ulaşılamadı {s.ulasilamadi}</span>}
            {s.iptal > 0 && <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">İptal {s.iptal}</span>}
          </div>

          {/* Saat Bazlı Liste */}
          <Card>
            <CardContent className="p-0 divide-y">
              {filteredSlots.map((slot) => {
                const allDone = slot.tickets.every(t => t.durum === 'Tur Bitti' || t.durum === 'İptal')
                return (
                  <div key={slot.saat}>
                    {/* Saat başlığı */}
                    <div className={`flex items-center justify-between px-3 py-2 ${allDone ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold w-12">{slot.saat}</span>
                        <span className="text-xs text-gray-500">{slot.kisi} kişi</span>
                      </div>
                      {allDone && <span className="text-[10px] font-bold text-green-600">TAMAM</span>}
                    </div>
                    {/* Bilet satırları */}
                    {slot.tickets.map((t, i) => {
                      const d = durumStyle[t.durum] || durumStyle['-']
                      const isIptal = t.durum === 'İptal'
                      const isDone = t.durum === 'Tur Bitti'
                      return (
                        <div key={i} className={`px-3 py-2 border-t border-gray-100 ${isDone ? 'bg-green-50/50' : isIptal ? 'bg-red-50/50' : ''}`}>
                          <div className="flex items-start gap-2">
                            {/* Sol: bilgi */}
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${isIptal ? 'line-through text-gray-400' : ''}`}>
                                {t.otel}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                <span className="font-medium text-gray-600">{t.bolge}</span>
                                {' · '}{t.acente}
                              </div>
                              {(t.irtibat || t.telefon) && (
                                <div className="text-[11px] text-gray-400 mt-0.5">
                                  {t.irtibat} {t.telefon}
                                </div>
                              )}
                            </div>
                            {/* Sağ: sayılar + durum */}
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                              <div className="text-sm font-bold">
                                {t.yolcu}
                                {t.cocuk > 0 && <span className="text-orange-500 text-xs ml-0.5">+{t.cocuk}ç</span>}
                              </div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${d.cls}`}>{d.label}</span>
                              {t.rest && t.rest !== '0' && <span className="text-[10px] text-emerald-600 font-medium">{t.rest}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
