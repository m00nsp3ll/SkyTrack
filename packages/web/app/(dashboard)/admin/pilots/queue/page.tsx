'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pilotsApi } from '@/lib/api'
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Plane,
  Coffee,
  Moon,
  UserPlus,
  User,
  Users,
  ArrowUpToLine,
} from 'lucide-react'

interface Pilot {
  id: string
  name: string
  status: 'AVAILABLE' | 'ASSIGNED' | 'PICKED_UP' | 'IN_FLIGHT' | 'ON_BREAK' | 'OFF_DUTY' | 'UNAVAILABLE'
  dailyFlightCount: number
  maxDailyFlights: number
  queuePosition: number
  inQueue: boolean
  isInExcel?: boolean
  priorityOverride?: boolean
  roundCount?: number
}

const statusConfig = {
  AVAILABLE: { label: 'Müsait', color: 'text-green-600', icon: CheckCircle },
  ASSIGNED: { label: 'Müşteri Atandı', color: 'text-purple-600', icon: UserPlus },
  PICKED_UP: { label: 'Müşteri Alındı', color: 'text-blue-500', icon: User },
  IN_FLIGHT: { label: 'Uçuşta', color: 'text-blue-600', icon: Plane },
  ON_BREAK: { label: 'Molada', color: 'text-yellow-600', icon: Coffee },
  OFF_DUTY: { label: 'Mesai Dışı', color: 'text-gray-500', icon: Moon },
  UNAVAILABLE: { label: 'Müsait Değil', color: 'text-orange-600', icon: Moon },
} as const

export default function PilotQueuePage() {
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  // queue_position sabit Excel forma numarası — sürükle-bırak devre dışı

  const fetchQueue = async () => {
    try {
      const response = await pilotsApi.getQueue()
      setPilots(response.data.data.queue)
    } catch (error) {
      console.error('Failed to fetch queue:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  const handlePriorityOverride = async (pilotId: string, enabled: boolean) => {
    try {
      await pilotsApi.setPriorityOverride(pilotId, enabled)
      await fetchQueue()
    } catch (error) {
      console.error('Failed to set priority override:', error)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Excel'de olan tüm pilotlar (is_in_excel=true) ana listede, sıralama roundCount asc → forma asc
  // in_queue=false olanlar bile listede kalır ("Sırada Değil" rozeti + auto-forfeit)
  const busyStatuses = ['PICKED_UP', 'ASSIGNED', 'IN_FLIGHT']
  const offStatuses = ['OFF_DUTY', 'ON_BREAK', 'UNAVAILABLE']
  const inQueuePilots = pilots
    .filter((p: any) => p.isInExcel === true)
    .sort((a, b) => {
      // Sıralama: AVAILABLE önce → OFF_DUTY/ON_BREAK ortada → uçuşta en sona
      const aGroup = busyStatuses.includes(a.status) ? 2 : offStatuses.includes(a.status) ? 1 : 0
      const bGroup = busyStatuses.includes(b.status) ? 2 : offStatuses.includes(b.status) ? 1 : 0
      if (aGroup !== bGroup) return aGroup - bGroup
      // priorityOverride önce
      const ap = (a as any).priorityOverride ? 1 : 0
      const bp = (b as any).priorityOverride ? 1 : 0
      if (ap !== bp) return bp - ap
      // roundCount ASC
      const ar = (a as any).roundCount ?? 0
      const br = (b as any).roundCount ?? 0
      if (ar !== br) return ar - br
      // queuePosition ASC
      return a.queuePosition - b.queuePosition
    })
  // Excel'de olmayan pilotlar — "Sisteme Dahil Değil" alt bölümü
  const outOfQueuePilots = pilots.filter((p: any) => p.isInExcel === false || p.isInExcel === undefined && !p.inQueue)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/pilots">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pilot Sırası</h1>
            <p className="text-muted-foreground">
              Excel forma numarasına göre sabit sıralama
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/teams">
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <Users className="h-4 w-4 mr-1" />
              Takım Yönetimi
            </Button>
          </Link>
        </div>
      </div>

      {/* Info */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p>
            <strong>Not:</strong> Müşteri ataması <strong>tamamen sıraya göre</strong> yapılır.
          </p>
          <ol className="list-decimal ml-4 mt-2 space-y-1">
            <li><strong>Sıradaki pilot</strong> (listenin en üstündeki müsait pilot) yeni müşteriyi alır</li>
            <li>Müşteri aldıktan sonra pilot otomatik olarak <strong>sıranın sonuna</strong> geçer</li>
            <li>Günlük limit dolana kadar (varsayılan 7 uçuş) pilot sırada kalır</li>
          </ol>
          <p className="mt-2 text-blue-600 dark:text-blue-400">
            💡 Bu sayede <strong>round-robin</strong> (döngüsel) sıralama ile her pilot eşit fırsat alır.
          </p>
        </CardContent>
      </Card>

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle>Aktif Sıra ({inQueuePilots.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {inQueuePilots.map((pilot, index) => {
              const status = statusConfig[pilot.status] || statusConfig.AVAILABLE
              const displayPos = index + 1
              const StatusIcon = status.icon
              const isAtLimit = pilot.dailyFlightCount >= pilot.maxDailyFlights
              const isOffDuty = pilot.status === 'OFF_DUTY'
              const isOnBreak = pilot.status === 'ON_BREAK'
              const isNotInQueue = !pilot.inQueue
              // Renklendirme: sırada değil (turuncu), limit dolan (kırmızı), mesai dışı (gri), molada (sarı)
              const rowBg = isNotInQueue
                ? 'bg-orange-50 border-l-4 border-orange-400'
                : isAtLimit
                  ? 'bg-red-50 border-l-4 border-red-400'
                  : isOffDuty
                    ? 'bg-gray-100 border-l-4 border-gray-400'
                    : isOnBreak
                      ? 'bg-yellow-50 border-l-4 border-yellow-400'
                      : ''
              const numberBg = isNotInQueue
                ? 'bg-orange-500 text-white'
                : isAtLimit
                  ? 'bg-red-500 text-white'
                  : isOffDuty
                    ? 'bg-gray-400 text-white'
                    : isOnBreak
                      ? 'bg-yellow-500 text-white'
                      : 'bg-primary text-white'

              return (
                <div
                  key={pilot.id}
                  className={`flex items-center gap-4 p-4 transition-colors
                    ${rowBg}
                    hover:bg-gray-50
                  `}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0 ${numberBg}`}>
                    {displayPos}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{pilot.name}</p>
                      {isNotInQueue && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-200 text-orange-800">Sırada Değil</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <StatusIcon className={`h-3 w-3 ${status.color}`} />
                      <span className={status.color}>{status.label}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={isAtLimit ? 'text-red-600' : 'text-muted-foreground'}>
                        {pilot.dailyFlightCount}/{pilot.maxDailyFlights} uçuş
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(pilot as any).priorityOverride ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100"
                        onClick={() => handlePriorityOverride(pilot.id, false)}
                        title="Önceliği kaldır"
                      >
                        <ArrowUpToLine className="h-3 w-3 mr-1" />
                        Öncelikli
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => handlePriorityOverride(pilot.id, true)}
                        title="İlk sıraya al (bir uçuşluk)"
                      >
                        <ArrowUpToLine className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sisteme Dahil Değil — Excel'de olmayan, henüz sisteme girmemiş pilotlar */}
      {outOfQueuePilots.length > 0 && (
        <Card className="mt-6 border-orange-200">
          <CardHeader className="bg-orange-50 border-b border-orange-200">
            <CardTitle className="text-orange-700 text-base">
              Sisteme Dahil Değil ({outOfQueuePilots.length})
            </CardTitle>
            <p className="text-xs text-orange-600 mt-1">Excel'de yok — sıraya katılmıyor, otomatik feragat almıyor</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {outOfQueuePilots
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
                .map((pilot: any) => {
                  const status = statusConfig[pilot.status as keyof typeof statusConfig] || statusConfig.AVAILABLE
                  const StatusIcon = status.icon
                  return (
                    <div key={pilot.id} className="flex items-center gap-4 p-4 opacity-70">
                      <div className="w-5" />
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-300 text-white rounded-full text-sm font-bold flex-shrink-0">—</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{pilot.name}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <StatusIcon className={`h-3 w-3 ${status.color}`} />
                          <span className={status.color}>{status.label}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
