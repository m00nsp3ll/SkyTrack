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
} from 'lucide-react'

interface Pilot {
  id: string
  name: string
  phone: string
  email?: string
  status: 'AVAILABLE' | 'ASSIGNED' | 'PICKED_UP' | 'IN_FLIGHT' | 'ON_BREAK' | 'OFF_DUTY'
  dailyFlightCount: number
  maxDailyFlights: number
  queuePosition: number
  isActive: boolean
  _count?: { flights: number }
}

const statusConfig = {
  AVAILABLE: { label: 'Müsait', color: 'bg-green-500', icon: CheckCircle },
  ASSIGNED: { label: 'Müşteri Atandı', color: 'bg-purple-500', icon: UserPlus },
  PICKED_UP: { label: 'Müşteri Alındı', color: 'bg-blue-400', icon: User },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-blue-500', icon: Plane },
  ON_BREAK: { label: 'Molada', color: 'bg-yellow-500', icon: Coffee },
  OFF_DUTY: { label: 'Mesai Dışı', color: 'bg-gray-500', icon: Moon },
}

export default function PilotsPage() {
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')

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

  // Single queue: AVAILABLE pilots first, then busy pilots (IN_FLIGHT, ON_BREAK etc.)
  // Within each group, sorted by queuePosition
  // Limit reached pilots shown separately at bottom
  const queuePilots = filteredPilots
    .filter((p) => p.isActive && p.dailyFlightCount < p.maxDailyFlights)
    .sort((a, b) => {
      const aAvailable = a.status === 'AVAILABLE' ? 0 : 1
      const bAvailable = b.status === 'AVAILABLE' ? 0 : 1
      if (aAvailable !== bAvailable) return aAvailable - bAvailable
      return a.queuePosition - b.queuePosition
    })
  const limitReachedPilots = filteredPilots.filter((p) => p.dailyFlightCount >= p.maxDailyFlights && p.isActive)
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
                const status = statusConfig[pilot.status]
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
                            <span className="flex items-center gap-1">
                              <Plane className="h-3 w-3" />
                              {pilot._count?.flights || 0} toplam uçuş
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

        {/* Limit Reached Pilots */}
        {limitReachedPilots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Bugün Uçuşu Dolanlar ({limitReachedPilots.length})</h2>
              <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">
                Günlük limit doldu
              </span>
            </div>
            <div className="grid gap-4">
              {limitReachedPilots.map((pilot) => {
                const status = statusConfig[pilot.status]
                const StatusIcon = status.icon

                return (
                  <Card key={pilot.id} className="opacity-75 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Limit Badge */}
                        <div className="hidden sm:flex items-center justify-center px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
                          LİMİT
                        </div>

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
                            <span className="flex items-center gap-1">
                              <Plane className="h-3 w-3" />
                              {pilot._count?.flights || 0} toplam uçuş
                            </span>
                          </div>
                        </div>

                        {/* Daily Stats */}
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">
                            {pilot.dailyFlightCount}/{pilot.maxDailyFlights}
                          </p>
                          <p className="text-xs text-muted-foreground">Bugün</p>
                        </div>

                        {/* Actions */}
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

        {/* Inactive Pilots */}
        {inactivePilots.length > 0 && filter === 'inactive' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Pasif Pilotlar ({inactivePilots.length})</h2>
            </div>
            <div className="grid gap-4">
              {inactivePilots.map((pilot) => {
                const status = statusConfig[pilot.status]
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
                            <span className="flex items-center gap-1">
                              <Plane className="h-3 w-3" />
                              {pilot._count?.flights || 0} toplam uçuş
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

      {/* Queue Reorder Link */}
      <Card>
        <CardContent className="p-4">
          <Link href="/admin/pilots/queue">
            <Button variant="outline" className="w-full">
              <GripVertical className="h-4 w-4 mr-2" />
              Pilot Sırasını Düzenle
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
