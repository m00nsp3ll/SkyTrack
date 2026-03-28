'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { api } from '@/lib/api'
import { UserPlus, Search, QrCode, ChevronRight } from 'lucide-react'

interface Customer {
  id: string
  displayId: string
  firstName: string
  lastName: string
  phone: string
  status: string
  createdAt: string
  assignedPilot: { id: string; name: string } | null
  flights: { id: string; status: string }[]
}

const statusLabels: Record<string, { label: string; color: string }> = {
  REGISTERED: { label: 'Kayıtlı', color: 'bg-gray-100 text-gray-700' },
  ASSIGNED: { label: 'Pilot Atandı', color: 'bg-blue-100 text-blue-700' },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-purple-100 text-purple-700' },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-700' },
}

type QuickFilter = 'today' | 'week' | 'month' | 'year' | 'custom'

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getQuickDates(filter: QuickFilter): { from: string; to: string } {
  const today = new Date()
  const to = toLocalDateStr(today)
  if (filter === 'today') return { from: to, to }
  if (filter === 'week') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return { from: toLocalDateStr(d), to }
  }
  if (filter === 'month') {
    const d = new Date(today)
    d.setDate(1)
    return { from: toLocalDateStr(d), to }
  }
  if (filter === 'year') {
    const d = new Date(today.getFullYear(), 0, 1)
    return { from: toLocalDateStr(d), to }
  }
  return { from: '', to }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [totalCount, setTotalCount] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('today')
  const [dateFrom, setDateFrom] = useState(() => getQuickDates('today').from)
  const [dateTo, setDateTo] = useState(() => getQuickDates('today').to)

  const fetchCustomers = async (cursor?: string, append = false, from?: string, to?: string, status?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const activeStatus = status !== undefined ? status : statusFilter
      if (activeStatus !== 'all') params.append('status', activeStatus)
      if (cursor) params.append('cursor', cursor)
      const activeFrom = from !== undefined ? from : dateFrom
      const activeTo = to !== undefined ? to : dateTo
      if (activeFrom) params.append('from', activeFrom)
      if (activeTo) params.append('to', activeTo)
      params.append('limit', '20')

      const response = await api.get(`/customers?${params.toString()}`)
      const { data, pagination } = response.data

      if (append) {
        setCustomers(prev => [...prev, ...data])
      } else {
        setCustomers(data)
      }
      setTotalCount(pagination.totalToday)
      setNextCursor(pagination.nextCursor)
      setHasMore(pagination.hasMore)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers(undefined, false, dateFrom, dateTo, statusFilter)
  }, [statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCustomers(undefined, false, dateFrom, dateTo)
  }

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter)
    if (filter !== 'custom') {
      const { from, to } = getQuickDates(filter)
      setDateFrom(from)
      setDateTo(to)
      fetchCustomers(undefined, false, from, to)
    }
  }

  const handleDateFilter = () => {
    setQuickFilter('custom')
    fetchCustomers(undefined, false, dateFrom, dateTo)
  }

  const loadMore = () => {
    if (nextCursor) fetchCustomers(nextCursor, true)
  }

  const getFlightStatus = (customer: Customer) => {
    if (customer.flights.length === 0) return null
    return customer.flights[0].status
  }

  const quickButtons: { label: string; value: QuickFilter }[] = [
    { label: 'Bugün', value: 'today' },
    { label: 'Bu Hafta', value: 'week' },
    { label: 'Bu Ay', value: 'month' },
    { label: 'Bu Yıl', value: 'year' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Müşteriler</h1>
          <p className="text-muted-foreground">
            Toplam {totalCount} müşteri
          </p>
        </div>

        {/* Tarih filtresi - sağ taraf */}
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
            className="w-36"
          />
          <span className="text-muted-foreground text-sm">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setQuickFilter('custom') }}
            className="w-36"
          />
          <Button size="sm" onClick={handleDateFilter}>Filtrele</Button>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/scan">
            <Button variant="outline">
              <QrCode className="w-4 h-4 mr-2" />
              QR Tara
            </Button>
          </Link>
          <Link href="/admin/customers/new">
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Yeni Kayıt
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-2">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ID, isim veya telefon ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" variant="secondary">Ara</Button>
              </form>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="REGISTERED">Kayıtlı</option>
                <option value="ASSIGNED">Pilot Atandı</option>
                <option value="IN_FLIGHT">Uçuşta</option>
                <option value="COMPLETED">Tamamlandı</option>
                <option value="CANCELLED">İptal</option>
              </select>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && customers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Yükleniyor...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Müşteri bulunamadı</p>
              <Link href="/admin/customers/new">
                <Button className="mt-4">
                  <UserPlus className="w-4 h-4 mr-2" />
                  İlk Müşteriyi Kaydet
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {customers.map((customer) => {
                  const status = statusLabels[customer.status] || statusLabels.REGISTERED
                  getFlightStatus(customer)

                  return (
                    <Link
                      key={customer.id}
                      href={`/admin/customers/${customer.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-primary font-medium">
                            {customer.displayId}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="font-medium truncate">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phone}
                        </p>
                      </div>

                      <div className="hidden sm:block text-right">
                        {customer.assignedPilot ? (
                          <p className="text-sm font-medium">{customer.assignedPilot.name}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Pilot bekleniyor</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(customer.createdAt).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}{' '}
                          {new Date(customer.createdAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Link>
                  )
                })}
              </div>

              {hasMore && (
                <div className="p-4 text-center border-t">
                  <Button variant="outline" onClick={loadMore} disabled={loading}>
                    {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
