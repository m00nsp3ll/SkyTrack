'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pilotsApi } from '@/lib/api'
import {
  UserPlus,
  User,
  Search,
  Phone,
  Plane,
  Coffee,
  Moon,
  CheckCircle,
  RefreshCw,
  GripVertical,
  Edit,
  SkipForward,
  Users,
} from 'lucide-react'

interface Pilot {
  id: string
  name: string
  phone: string
  email?: string
  status: 'AVAILABLE' | 'ASSIGNED' | 'PICKED_UP' | 'IN_FLIGHT' | 'ON_BREAK' | 'OFF_DUTY' | 'UNAVAILABLE'
  dailyFlightCount: number
  maxDailyFlights: number
  queuePosition: number
  isActive: boolean
  inQueue: boolean
  forfeitCount?: number
  lockedUntilRound?: number | null
  roundCount?: number
  _count?: { flights: number }
}

const statusConfig = {
  AVAILABLE: { label: 'Müsait', color: 'bg-green-500', icon: CheckCircle },
  ASSIGNED: { label: 'Müşteri Atandı', color: 'bg-purple-500', icon: UserPlus },
  PICKED_UP: { label: 'Müşteri Alındı', color: 'bg-blue-400', icon: User },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-blue-500', icon: Plane },
  ON_BREAK: { label: 'Molada', color: 'bg-yellow-500', icon: Coffee },
  OFF_DUTY: { label: 'Mesai Dışı', color: 'bg-gray-500', icon: Moon },
  UNAVAILABLE: { label: 'Müsait Değil', color: 'bg-orange-500', icon: Moon },
}

export default function PilotsPage() {
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [forfeitConfirm, setForfeitConfirm] = useState<{ id: string; name: string } | null>(null)
  const [forfeiting, setForfeiting] = useState(false)

  const handleForfeit = async () => {
    if (!forfeitConfirm) return
    setForfeiting(true)
    try {
      await pilotsApi.forfeit(forfeitConfirm.id)
      setForfeitConfirm(null)
      fetchPilots()
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Feragat başarısız')
    } finally {
      setForfeiting(false)
    }
  }

  const fetchPilots = async () => {
    try {
      const response = await pilotsApi.getAll()
      setPilots(response.data.data)
    } catch (error) {
      console.error('Failed to fetch pilots:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPilots()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchPilots, 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredPilots = pilots.filter((pilot) => {
    const matchesSearch =
      pilot.name.toLowerCase().includes(search.toLowerCase()) ||
      pilot.phone.includes(search)
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && pilot.isActive) ||
      (filter === 'inactive' && !pilot.isActive) ||
      (filter === 'limit_reached' && pilot.dailyFlightCount >= pilot.maxDailyFlights) ||
      pilot.status === filter
    return matchesSearch && matchesFilter
  })

  // Aktif sıradaki pilotlar (inQueue=true, limit dolmamış)
  const queuePilots = filteredPilots
    .filter((p) => p.isActive && p.inQueue && p.dailyFlightCount < p.maxDailyFlights)
    .sort((a, b) => a.queuePosition - b.queuePosition)
  const limitReachedPilots = filteredPilots.filter((p) => p.dailyFlightCount >= p.maxDailyFlights && p.isActive)
  const notInQueuePilots = filteredPilots.filter((p) => p.isActive && !p.inQueue && p.dailyFlightCount < p.maxDailyFlights)
  const onBreakPilots = filteredPilots.filter((p) => p.isActive && p.inQueue && p.status === 'ON_BREAK' && p.dailyFlightCount < p.maxDailyFlights)
  const offDutyPilots = filteredPilots.filter((p) => p.isActive && p.inQueue && p.status === 'OFF_DUTY' && p.dailyFlightCount < p.maxDailyFlights)
  const inactivePilots = filteredPilots.filter((p) => !p.isActive)

  // First AVAILABLE pilot in queue is the next one to receive a customer
  const nextPilotId = queuePilots.find(
    (p) => p.status === 'AVAILABLE'
  )?.id

  const stats = {
    total: pilots.length,
    available: pilots.filter((p) => p.status === 'AVAILABLE' && p.isActive && p.dailyFlightCount < p.maxDailyFlights).length,
    inFlight: pilots.filter((p) => p.status === 'IN_FLIGHT').length,
    onBreak: pilots.filter((p) => p.status === 'ON_BREAK').length,
    limitReached: pilots.filter((p) => p.dailyFlightCount >= p.maxDailyFlights && p.isActive).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pilot Yönetimi</h1>
          <p className="text-muted-foreground">
            Toplam {stats.total} pilot, {stats.available} müsait
          </p>
        </div>
        <Link href="/admin/pilots/new">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Yeni Pilot
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Toplam</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.available}</p>
            <p className="text-sm text-muted-foreground">Müsait</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.inFlight}</p>
            <p className="text-sm text-muted-foreground">Uçuşta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.onBreak}</p>
            <p className="text-sm text-muted-foreground">Molada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.limitReached}</p>
            <p className="text-sm text-muted-foreground">Limit Dolu</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İsim veya telefon ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'Tümü' },
                { value: 'AVAILABLE', label: 'Müsait' },
                { value: 'IN_FLIGHT', label: 'Uçuşta' },
                { value: 'ON_BREAK', label: 'Molada' },
                { value: 'limit_reached', label: 'Limit Dolu' },
                { value: 'inactive', label: 'Pasif' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={filter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pilot Lists */}
      <div className="space-y-6">
        {/* Single Queue - All active pilots sorted by queuePosition */}
        {queuePilots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Pilot Sırası ({queuePilots.length})</h2>
            </div>
            <div className="grid gap-3">
              {queuePilots.map((pilot, index) => {
                const status = statusConfig[pilot.status] || statusConfig.AVAILABLE
                const StatusIcon = status.icon
                const isNext = pilot.id === nextPilotId

                return (
                  <Card
                    key={pilot.id}
                    className={
                      isNext
                        ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950'
                        : pilot.status === 'IN_FLIGHT'
                        ? 'bg-blue-50/50'
                        : pilot.status === 'ON_BREAK'
                        ? 'bg-yellow-50/50'
                        : ''
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Queue Position */}
                        {isNext ? (
                          <div className="hidden sm:flex items-center justify-center px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold animate-pulse">
                            SIRADA
                          </div>
                        ) : (
                          <div className="hidden sm:flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium">
                            {index + 1}
                          </div>
                        )}

                        {/* Pilot Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{pilot.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${status.color}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {pilot.phone}
                            </span>
                          </div>
                        </div>

                        {/* Daily Stats */}
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            {pilot.dailyFlightCount}/{pilot.maxDailyFlights}
                          </p>
                          <p className="text-xs text-muted-foreground">Bugün</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            onClick={() => setForfeitConfirm({ id: pilot.id, name: pilot.name })}
                            title="Feragat — pilotu kuyruğun sonuna at"
                          >
                            <SkipForward className="h-4 w-4 mr-1" />
                            Feragat
                          </Button>
                          <Link href={`/admin/pilots/${pilot.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Detay
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Limit Reached Pilots */}
        {limitReachedPilots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-red-300" />
              <span className="text-sm font-medium text-red-500 whitespace-nowrap">Günlük Limit Doldu ({limitReachedPilots.length})</span>
              <div className="flex-1 h-px bg-red-300" />
            </div>
            <div className="grid gap-3">
              {limitReachedPilots.map((pilot) => {
                const status = statusConfig[pilot.status] || statusConfig.AVAILABLE
                const StatusIcon = status.icon
                return (
                  <Card key={pilot.id} className="opacity-75 bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center justify-center px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold">LİMİT</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{pilot.name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />{status.label}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{pilot.phone}</span>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{pilot.dailyFlightCount}/{pilot.maxDailyFlights}</p>
                          <p className="text-xs text-muted-foreground">Bugün</p>
                        </div>
                        <Link href={`/admin/pilots/${pilot.id}`}><Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" />Detay</Button></Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Molada Pilotlar */}
        {onBreakPilots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-yellow-300" />
              <span className="text-sm font-medium text-yellow-600 whitespace-nowrap">Molada ({onBreakPilots.length})</span>
              <div className="flex-1 h-px bg-yellow-300" />
            </div>
            <div className="grid gap-3">
              {onBreakPilots.map((pilot) => (
                <Card key={pilot.id} className="opacity-75 bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center justify-center px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-bold">MOLA</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{pilot.name}</h3>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{pilot.phone}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{pilot.dailyFlightCount}/{pilot.maxDailyFlights}</p>
                        <p className="text-xs text-muted-foreground">Bugün</p>
                      </div>
                      <Link href={`/admin/pilots/${pilot.id}`}><Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" />Detay</Button></Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Mesai Dışı Pilotlar */}
        {offDutyPilots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Mesai Dışı ({offDutyPilots.length})</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
            <div className="grid gap-3">
              {offDutyPilots.map((pilot) => (
                <Card key={pilot.id} className="opacity-60 bg-gray-50 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center justify-center px-3 py-1 bg-gray-500 text-white rounded-full text-xs font-bold">MESAİ DIŞI</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{pilot.name}</h3>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{pilot.phone}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{pilot.dailyFlightCount}/{pilot.maxDailyFlights}</p>
                        <p className="text-xs text-muted-foreground">Bugün</p>
                      </div>
                      <Link href={`/admin/pilots/${pilot.id}`}><Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" />Detay</Button></Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Sırada Değil */}
        {notInQueuePilots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-orange-300" />
              <span className="text-sm font-medium text-orange-500 whitespace-nowrap">Sırada Değil ({notInQueuePilots.length})</span>
              <div className="flex-1 h-px bg-orange-300" />
            </div>
            <div className="grid gap-3">
              {notInQueuePilots.map((pilot) => {
                const status = statusConfig[pilot.status] || statusConfig.AVAILABLE
                const StatusIcon = status.icon
                return (
                  <Card key={pilot.id} className="opacity-60 bg-orange-50 border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center justify-center px-3 py-1 bg-orange-400 text-white rounded-full text-xs font-bold">SIRADA DEĞİL</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{pilot.name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />{status.label}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{pilot.phone}</span>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{pilot.dailyFlightCount}/{pilot.maxDailyFlights}</p>
                          <p className="text-xs text-muted-foreground">Bugün</p>
                        </div>
                        <Link href={`/admin/pilots/${pilot.id}`}><Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" />Detay</Button></Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Inactive Pilots */}
        {inactivePilots.length > 0 && filter === 'inactive' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Pasif Pilotlar ({inactivePilots.length})</h2>
            </div>
            <div className="grid gap-4">
              {inactivePilots.map((pilot) => {
                const status = statusConfig[pilot.status] || statusConfig.AVAILABLE
                const StatusIcon = status.icon

                return (
                  <Card key={pilot.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium">
                          -
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{pilot.name}</h3>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600">
                              Pasif
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {pilot.phone}
                            </span>
                          </div>
                        </div>

                        <Link href={`/admin/pilots/${pilot.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Detay
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {queuePilots.length === 0 && limitReachedPilots.length === 0 && inactivePilots.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Pilot bulunamadı</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Queue Reorder + Team Management Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link href="/admin/pilots/queue">
          <Button variant="outline" className="w-full h-14">
            <GripVertical className="h-4 w-4 mr-2" />
            Pilot Sırasını Düzenle
          </Button>
        </Link>
        <Link href="/admin/teams">
          <Button variant="outline" className="w-full h-14 border-purple-300 text-purple-700 hover:bg-purple-50">
            <Users className="h-4 w-4 mr-2" />
            Takım Yönetimi
          </Button>
        </Link>
      </div>

      {/* Forfeit Confirmation Modal */}
      {forfeitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2 text-orange-700">⏭️ Feragat Onayı</h2>
            <p className="text-gray-700 mb-4">
              <strong>{forfeitConfirm.name}</strong> pilotunu feragat ettirmek istediğinize emin misiniz?
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Pilot kuyruğun en sonuna gönderilir ve <strong>1 tam tur sonrasına</strong> kadar sıraya giremez.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setForfeitConfirm(null)} disabled={forfeiting}>
                İptal
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleForfeit}
                disabled={forfeiting}
              >
                {forfeiting ? 'İşleniyor...' : 'Evet, Feragat Et'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
