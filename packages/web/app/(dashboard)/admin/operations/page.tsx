'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Radio, Users, CheckCircle, Clock, MapPin, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface TimeSlot {
  saat: string
  kisi: number
  cikmis: number
  tickets: {
    no: string
    biletId: string
    acente: string
    otel: string
    yolcu: number
    cikmis: number
    irtibat: string
    aciklama: string
  }[]
}

interface ProAgentData {
  date: string
  summary: { totalPax: number; turBitti: number; kalan: number }
  timeSlots: TimeSlot[]
}

export default function OperationsPage() {
  const [data, setData] = useState<ProAgentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

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

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-6 w-6 text-green-600" />
          <h1 className="text-xl font-bold">Operasyon</h1>
          {lastUpdate && (
            <span className="text-xs text-gray-400 ml-2">Son: {lastUpdate}</span>
          )}
        </div>
        <Button onClick={fetchData} disabled={loading} size="sm" variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Güncelle
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      {!data && !loading && !error && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Radio className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>ProAgent verisi henüz yüklenmedi</p>
            <p className="text-xs mt-1">Yukarıdaki "Güncelle" butonuna basın</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Özet Kartları */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3 text-center">
                <Users className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                <div className="text-2xl font-bold text-blue-700">{data.summary.totalPax}</div>
                <div className="text-xs text-blue-600">Toplam Kişi</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-3 text-center">
                <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <div className="text-2xl font-bold text-green-700">{data.summary.turBitti}</div>
                <div className="text-xs text-green-600">Tur Bitti</div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3 text-center">
                <Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                <div className="text-2xl font-bold text-amber-700">{data.summary.kalan}</div>
                <div className="text-xs text-amber-600">Kalan Kişi</div>
              </CardContent>
            </Card>
          </div>

          {/* Saat Bazlı Liste */}
          <Card>
            <CardHeader className="py-3 px-4 bg-gray-50 border-b">
              <CardTitle className="text-sm font-semibold text-gray-600">Saat Bazlı Dağılım</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.timeSlots.map((slot) => {
                  const kalan = slot.kisi - slot.cikmis
                  const hepsiGeldi = slot.kisi > 0 && kalan <= 0
                  return (
                    <div key={slot.saat}>
                      {/* Saat başlığı */}
                      <div className={`flex items-center justify-between px-4 py-2.5 ${hepsiGeldi ? 'bg-green-50' : kalan > 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-800 w-14">{slot.saat}</span>
                          <span className="text-sm font-medium">
                            {slot.kisi} kişi
                          </span>
                          {slot.cikmis > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              {slot.cikmis} çıkmış
                            </span>
                          )}
                        </div>
                        <div>
                          {hepsiGeldi ? (
                            <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">Tur Bitti</span>
                          ) : kalan > 0 ? (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded">{kalan} bekliyor</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                      {/* Bilet detayları */}
                      <div className="divide-y divide-gray-100">
                        {slot.tickets.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 px-4 py-1.5 text-xs text-gray-500 pl-8">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="flex-1 truncate">{t.otel}</span>
                            <span className="text-gray-400">{t.acente}</span>
                            <span className="font-medium text-gray-700">{t.yolcu} kişi</span>
                            {t.cikmis > 0 && <span className="text-green-600">({t.cikmis} çıkmış)</span>}
                          </div>
                        ))}
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
