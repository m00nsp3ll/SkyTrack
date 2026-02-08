'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { flightsApi, pilotsApi } from '@/lib/api'
import {
  Search,
  RefreshCw,
  Plane,
  Calendar,
  Clock,
  User,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react'

interface Flight {
  id: string
  status: string
  createdAt: string
  takeoffAt?: string
  landingAt?: string
  durationMinutes?: number
  customer: {
    id: string
    displayId: string
    firstName: string
    lastName: string
    phone: string
    weight: number
  }
  pilot: {
    id: string
    name: string
  }
}

interface Pilot {
  id: string
  name: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: 'Atandı', color: 'bg-gray-100 text-gray-700' },
  PICKED_UP: { label: 'Alındı', color: 'bg-yellow-100 text-yellow-700' },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-700' },
}

export default function FlightsListPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pilotFilter, setPilotFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0])

  const fetchFlights = async (cursor?: string) => {
    try {
      setLoading(true)
      const params: any = { limit: 50 }

      if (statusFilter !== 'all') params.status = statusFilter
      if (pilotFilter) params.pilotId = pilotFilter
      if (dateFilter) params.date = dateFilter
      if (search) params.search = search
      if (cursor) params.cursor = cursor

      const response = await flightsApi.getAll(params)
      const data = response.data

      if (cursor) {
        setFlights((prev) => [...prev, ...data.data])
      } else {
        setFlights(data.data)
      }

      setHasMore(data.pagination?.hasMore || false)
      setNextCursor(data.pagination?.nextCursor || null)
    } catch (error) {
      console.error('Failed to fetch flights:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPilots = async () => {
    try {
      const response = await pilotsApi.getAll()
      setPilots(response.data.data)
    } catch (error) {
      console.error('Failed to fetch pilots:', error)
    }
  }

  useEffect(() => {
    fetchPilots()
  }, [])

  useEffect(() => {
    fetchFlights()
  }, [statusFilter, pilotFilter, dateFilter])

  const handleSearch = () => {
    fetchFlights()
  }

  const loadMore = () => {
    if (nextCursor) {
      fetchFlights(nextCursor)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPilotFilter('')
    setDateFilter(new Date().toISOString().split('T')[0])
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Uçuş Geçmişi</h1>
          <p className="text-muted-foreground">Tüm uçuşları görüntüle ve filtrele</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/flights">
            <Button variant="outline">
              <Plane className="h-4 w-4 mr-2" />
              Canlı Takip
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri adı veya ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="ASSIGNED">Atandı</option>
              <option value="PICKED_UP">Alındı</option>
              <option value="IN_FLIGHT">Uçuşta</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="CANCELLED">İptal</option>
            </select>

            {/* Pilot Filter */}
            <select
              value={pilotFilter}
              onChange={(e) => setPilotFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Tüm Pilotlar</option>
              {pilots.map((pilot) => (
                <option key={pilot.id} value={pilot.id}>
                  {pilot.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filters */}
          {(search || statusFilter !== 'all' || pilotFilter) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Aktif filtreler:</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Temizle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flights List */}
      {loading && flights.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : flights.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Plane className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Uçuş bulunamadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {flights.map((flight) => {
            const status = statusLabels[flight.status] || { label: flight.status, color: 'bg-gray-100' }

            return (
              <Link key={flight.id} href={`/admin/customers/${flight.customer.displayId}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {flight.customer.displayId}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="font-medium truncate">
                          {flight.customer.firstName} {flight.customer.lastName}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {flight.pilot.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(flight.createdAt)}
                          </span>
                          {flight.durationMinutes && (
                            <span>{flight.durationMinutes} dk</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button onClick={loadMore} variant="outline" disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Daha Fazla Yükle
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
