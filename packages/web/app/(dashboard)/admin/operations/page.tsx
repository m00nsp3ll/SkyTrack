'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Radio, Users, CheckCircle, Clock, MapPin, Loader2, Plane, Building, Phone, Eye, EyeOff } from 'lucide-react'
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
  tur: string
  irtibat: string
  telefon: string
  rest: string
}

interface TimeSlot {
  saat: string
  kisi: number
  tickets: Ticket[]
}

interface ProAgentData {
  date: string
  summary: {
    totalPax: number
    turBitti: number
    ofiste: number
    transferde: number
    ucusta: number
    bekleyen: number
    ulasilamadi: number
  }
  timeSlots: TimeSlot[]
}

const durumConfig: Record<string, { label: string; bg: string; text: string }> = {
  'Tur Bitti': { label: 'Tur Bitti', bg: 'bg-green-100', text: 'text-green-700' },
  'Ofiste': { label: 'Ofiste', bg: 'bg-blue-100', text: 'text-blue-700' },
  'Transfer Sürecinde': { label: 'Transferde', bg: 'bg-orange-100', text: 'text-orange-700' },
  'Uçusta': { label: 'Uçusta', bg: 'bg-purple-100', text: 'text-purple-700' },
  'Ulaşılamadı': { label: 'Ulaşılamadı', bg: 'bg-red-100', text: 'text-red-700' },
  '-': { label: 'Bekliyor', bg: 'bg-gray-100', text: 'text-gray-600' },
  '': { label: 'Bekliyor', bg: 'bg-gray-100', text: 'text-gray-600' },
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
    tickets: hideDone ? slot.tickets.filter(t => t.durum !== 'Tur Bitti') : slot.tickets,
  })).filter(slot => slot.tickets.length > 0) || []

  // Toplam kişi/çocuk ayrımı
  const totalKisi = data?.timeSlots.reduce((s, slot) => s + slot.tickets.reduce((ss, t) => ss + t.yolcu, 0), 0) || 0
  const totalCocuk = data?.timeSlots.reduce((s, slot) => s + slot.tickets.reduce((ss, t) => ss + t.cocuk, 0), 0) || 0

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Radio className="h-6 w-6 text-green-600" />
          <h1 className="text-xl font-bold">Operasyon</h1>
          {lastUpdate && (
            <span className="text-xs text-gray-400">({lastUpdate})</span>
          )}
        </div>
        <div className="flex gap-2">
          {data && (
            <Button
              size="sm"
              variant={hideDone ? 'default' : 'outline'}
              onClick={() => setHideDone(!hideDone)}
              className="text-xs"
            >
              {hideDone ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
              {hideDone ? 'Hepsini Göster' : 'Tamamlananları Gizle'}
            </Button>
          )}
          <Button onClick={fetchData} disabled={loading} size="sm" variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Güncelle
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      {!data && !loading && !error && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Radio className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>ProAgent verisi henüz yüklenmedi</p>
            <p className="text-xs mt-1">Yukaridaki &quot;Güncelle&quot; butonuna basin</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Özet Kartları */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-2.5 text-center">
                <div className="text-2xl font-bold text-blue-700">{totalKisi}<span className="text-sm font-normal">+{totalCocuk}ç</span></div>
                <div className="text-[10px] text-blue-600">Toplam ({totalKisi + totalCocuk})</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-2.5 text-center">
                <div className="text-2xl font-bold text-green-700">{data.summary.turBitti}</div>
                <div className="text-[10px] text-green-600">Tur Bitti</div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-2.5 text-center">
                <div className="text-2xl font-bold text-amber-700">{data.summary.bekleyen + data.summary.transferde}</div>
                <div className="text-[10px] text-amber-600">Bekleyen + Transfer</div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-2.5 text-center">
                <div className="text-2xl font-bold text-purple-700">{data.summary.ofiste + data.summary.ucusta}</div>
                <div className="text-[10px] text-purple-600">Ofiste + Uçusta</div>
              </CardContent>
            </Card>
          </div>

          {/* Durum çubukları */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {data.summary.transferde > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Transferde: {data.summary.transferde}</span>}
            {data.summary.ofiste > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Ofiste: {data.summary.ofiste}</span>}
            {data.summary.ucusta > 0 && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Uçusta: {data.summary.ucusta}</span>}
            {data.summary.ulasilamadi > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Ulaşılamadı: {data.summary.ulasilamadi}</span>}
          </div>

          {/* Saat Bazlı Liste */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredSlots.map((slot) => {
                  const slotDone = slot.tickets.every(t => t.durum === 'Tur Bitti')
                  return (
                    <div key={slot.saat}>
                      {/* Saat başlığı */}
                      <div className={`flex items-center justify-between px-3 py-2 border-b ${slotDone ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-base font-bold">{slot.saat}</span>
                          <span className="text-xs text-gray-500">{slot.kisi} kişi</span>
                        </div>
                        {slotDone && <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">TAMAMLANDI</span>}
                      </div>
                      {/* Bilet detayları */}
                      <div className="divide-y divide-gray-100">
                        {slot.tickets.map((t, i) => {
                          const cfg = durumConfig[t.durum] || durumConfig['-']
                          return (
                            <div key={i} className={`px-3 py-2 ${t.durum === 'Tur Bitti' ? 'opacity-60' : ''}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {/* Otel + Bölge */}
                                  <div className="flex items-center gap-1.5">
                                    <Building className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-medium truncate" title={t.otel}>{t.otel}</span>
                                  </div>
                                  {/* Bölge + Acente */}
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span>{t.bolge}</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="truncate">{t.acente}</span>
                                  </div>
                                  {/* İrtibat + Telefon */}
                                  {(t.irtibat || t.telefon) && (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                                      <Phone className="h-3 w-3 flex-shrink-0" />
                                      <span>{t.irtibat}{t.telefon ? ` ${t.telefon}` : ''}</span>
                                    </div>
                                  )}
                                </div>
                                {/* Sağ taraf: kişi, durum, rest */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold">{t.yolcu}<span className="text-[10px] text-gray-400">K</span></span>
                                    {t.cocuk > 0 && <span className="text-sm font-semibold text-orange-600">{t.cocuk}<span className="text-[10px]">Ç</span></span>}
                                  </div>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                                    {cfg.label}
                                  </span>
                                  {t.rest && t.rest !== '0' && (
                                    <span className="text-[10px] font-medium text-emerald-600">{t.rest}</span>
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
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
