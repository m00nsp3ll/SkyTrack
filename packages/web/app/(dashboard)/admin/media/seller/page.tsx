'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import {
  Camera, RefreshCw, FolderOpen, User, Plane,
  ChevronRight, ImageIcon, CheckCircle, Clock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PilotSummary {
  id: string
  name: string
  totalFlights: number
  mediaSold: number
  filesUploaded: number
  waitingUpload: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MediaPreviewPage() {
  const [pilots, setPilots] = useState<PilotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [openingPilotFolder, setOpeningPilotFolder] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchPilots = useCallback(async () => {
    try {
      const res = await api.get('/media/pilot-summary?date=today')
      setPilots(res.data?.data || [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchPilots()
    const interval = setInterval(() => {
      fetchPilots()
      setLastRefresh(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchPilots])

  const handleOpenPilotFolder = async (pilotId: string) => {
    setOpeningPilotFolder(pilotId)
    try {
      await api.post(`/media/pilot/${pilotId}/open-folder`)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Klasör açılamadı')
    } finally { setOpeningPilotFolder(null) }
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchPilots()
    setLastRefresh(new Date())
  }

  const totalFiles   = pilots.reduce((s, p) => s + p.filesUploaded, 0)
  const totalSold    = pilots.reduce((s, p) => s + p.mediaSold, 0)
  const totalWaiting = pilots.reduce((s, p) => s + p.waitingUpload, 0)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col gap-0">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Foto/Video Önizleme İstasyonu
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pilota tıkla → klasörü aç → müşteriye göster
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Özet Kartlar ── */}
      <div className="grid grid-cols-3 gap-3 py-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{pilots.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <Plane className="h-3 w-3" /> Aktif Pilot
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{totalFiles}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <ImageIcon className="h-3 w-3" /> Toplam Dosya
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className={`text-2xl font-bold ${totalWaiting > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {totalWaiting > 0 ? totalWaiting : totalSold}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              {totalWaiting > 0
                ? <><Clock className="h-3 w-3 text-yellow-500" /> Yükleme Bekliyor</>
                : <><CheckCircle className="h-3 w-3 text-green-500" /> Medya Satıldı</>
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Pilot Listesi ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/40" />
          </div>
        ) : pilots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Plane className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Bugün tamamlanan uçuş yok</p>
            <p className="text-sm text-muted-foreground mt-1">Uçuşlar tamamlandıkça pilotlar burada görünür</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pilots.map(pilot => (
              <button
                key={pilot.id}
                onClick={() => handleOpenPilotFolder(pilot.id)}
                disabled={openingPilotFolder === pilot.id}
                className="flex flex-col gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 bg-white text-left transition-all group disabled:opacity-60 shadow-sm hover:shadow-md"
              >
                {/* Pilot Başlık */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{pilot.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{pilot.totalFlights} uçuş bugün</p>
                    </div>
                  </div>
                  {openingPilotFolder === pilot.id
                    ? <RefreshCw className="h-5 w-5 animate-spin text-purple-400 flex-shrink-0" />
                    : <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                  }
                </div>

                {/* İstatistikler */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-gray-800">{pilot.filesUploaded}</p>
                    <p className="text-[10px] text-muted-foreground">Dosya</p>
                  </div>
                  <div className={`rounded-lg py-2 ${pilot.mediaSold > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <p className={`text-lg font-bold ${pilot.mediaSold > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                      {pilot.mediaSold}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Satıldı</p>
                  </div>
                  <div className={`rounded-lg py-2 ${pilot.waitingUpload > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                    <p className={`text-lg font-bold ${pilot.waitingUpload > 0 ? 'text-yellow-700' : 'text-gray-500'}`}>
                      {pilot.waitingUpload}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Bekliyor</p>
                  </div>
                </div>

                {/* Alt Bilgi */}
                <div className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold border-t pt-3">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Klasörü Aç — Önizle
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
