'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, RefreshCw, User, Plane, Clock, Weight } from 'lucide-react'
import { reportsApi } from '@/lib/api'

interface Flight {
  id: string
  status: 'COMPLETED' | 'CANCELLED'
  takeoffAt: string | null
  landingAt: string | null
  durationMinutes: number | null
  createdAt: string
  customer: {
    id: string
    displayId: string
    firstName: string
    lastName: string
    weight: number | null
    phone: string
  }
}

interface PilotFlightsData {
  pilot: { id: string; name: string }
  flights: Flight[]
  dateRange: { from: string; to: string }
}

type QuickFilter = 'today' | 'week' | 'month' | 'custom'

function getQuickDates(filter: QuickFilter): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().split('T')[0]
  if (filter === 'today') return { from: to, to }
  if (filter === 'week') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return { from: d.toISOString().split('T')[0], to }
  }
  if (filter === 'month') {
    const d = new Date(today)
    d.setDate(1)
    return { from: d.toISOString().split('T')[0], to }
  }
  const d = new Date(today)
  d.setDate(d.getDate() - 30)
  return { from: d.toISOString().split('T')[0], to }
}

export default function PilotFlightsPage() {
  const params = useParams()
  const pilotId = params.pilotId as string

  const [data, setData] = useState<PilotFlightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('today')
  const [dateFrom, setDateFrom] = useState(() => getQuickDates('today').from)
  const [dateTo, setDateTo] = useState(() => getQuickDates('today').to)

  const fetchData = async (from: string, to: string) => {
    setLoading(true)
    try {
      const res = await reportsApi.getPilotFlights(pilotId, from, to)
      setData(res.data.data)
    } catch (error) {
      console.error('Veri yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(dateFrom, dateTo)
  }, [])

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter)
    if (filter !== 'custom') {
      const { from, to } = getQuickDates(filter)
      setDateFrom(from)
      setDateTo(to)
      fetchData(from, to)
    }
  }

  const handleFilter = () => {
    setQuickFilter('custom')
    fetchData(dateFrom, dateTo)
  }

  const formatDateTime = (str: string | null) => {
    if (!str) return '-'
    return new Date(str).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (str: string) =>
    new Date(str).toLocaleDateString('tr-TR')

  const quickButtons: { label: string; value: QuickFilter }[] = [
    { label: 'Bugün', value: 'today' },
    { label: 'Bu Hafta', value: 'week' },
    { label: 'Bu Ay', value: 'month' },
  ]

  const completedFlights = data?.flights.filter(f => f.status === 'COMPLETED') || []
  const avgDuration =
    completedFlights.length > 0
      ? Math.round(
          completedFlights.reduce((s, f) => s + (f.durationMinutes || 0), 0) /
            completedFlights.length
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports/pilots">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {loading ? 'Yükleniyor...' : data?.pilot.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {data?.dateRange && (
                <>
                  {formatDate(data.dateRange.from)} - {formatDate(data.dateRange.to)}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {quickButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={quickFilter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyQuickFilter(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
          <span className="text-muted-foreground text-sm">|</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setQuickFilter('custom') }}
            className="w-38"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setQuickFilter('custom') }}
            className="w-38"
          />
          <Button onClick={handleFilter}>Filtrele</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Toplam Uçuş</CardTitle>
                <Plane className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{completedFlights.length}</p>
                <p className="text-xs text-muted-foreground">Tamamlanan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">İptal</CardTitle>
                <Plane className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">
                  {data?.flights.filter(f => f.status === 'CANCELLED').length || 0}
                </p>
                <p className="text-xs text-muted-foreground">İptal edilen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ort. Süre</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{avgDuration}</p>
                <p className="text-xs text-muted-foreground">Dakika</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Müşteri</CardTitle>
                <User className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.flights.length || 0}</p>
                <p className="text-xs text-muted-foreground">Toplam kayıt</p>
              </CardContent>
            </Card>
          </div>

          {/* Flights table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Uçuş Listesi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.flights.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Plane className="h-10 w-10 mb-3 opacity-30" />
                  <p>Bu tarih aralığında uçuş kaydı yok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-3 font-medium">#</th>
                        <th className="text-left py-3 px-3 font-medium">Müşteri</th>
                        <th className="text-center py-3 px-3 font-medium">
                          <span className="flex items-center justify-center gap-1">
                            <Weight className="h-3.5 w-3.5" />
                            Kilo
                          </span>
                        </th>
                        <th className="text-center py-3 px-3 font-medium">Kalkış</th>
                        <th className="text-center py-3 px-3 font-medium">İniş</th>
                        <th className="text-center py-3 px-3 font-medium">
                          <span className="flex items-center justify-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Süre
                          </span>
                        </th>
                        <th className="text-center py-3 px-3 font-medium">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.flights.map((flight, index) => (
                        <tr key={flight.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 text-muted-foreground">{index + 1}</td>
                          <td className="py-3 px-3">
                            <Link
                              href={`/admin/customers/${flight.customer.id}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {flight.customer.firstName} {flight.customer.lastName}
                            </Link>
                            <p className="text-xs text-muted-foreground">{flight.customer.phone}</p>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {flight.customer.weight ? (
                              <span className="font-medium">{flight.customer.weight} kg</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-xs">
                            {formatDateTime(flight.takeoffAt)}
                          </td>
                          <td className="py-3 px-3 text-center text-xs">
                            {formatDateTime(flight.landingAt)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {flight.durationMinutes ? (
                              <span className="font-medium">{flight.durationMinutes} dk</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {flight.status === 'COMPLETED' ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Tamamlandı
                              </Badge>
                            ) : (
                              <Badge variant="destructive">İptal</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
