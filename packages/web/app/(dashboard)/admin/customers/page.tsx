'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { UserPlus, Search, QrCode, Filter, ChevronRight } from 'lucide-react'

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [totalToday, setTotalToday] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchCustomers = async (cursor?: string, append = false) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (cursor) params.append('cursor', cursor)
      params.append('limit', '20')

      const response = await api.get(`/customers?${params.toString()}`)
      const { data, pagination } = response.data

      if (append) {
        setCustomers(prev => [...prev, ...data])
      } else {
        setCustomers(data)
      }
      setTotalToday(pagination.totalToday)
      setNextCursor(pagination.nextCursor)
      setHasMore(pagination.hasMore)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCustomers()
  }

  const loadMore = () => {
    if (nextCursor) {
      fetchCustomers(nextCursor, true)
    }
  }

  const getFlightStatus = (customer: Customer) => {
    if (customer.flights.length === 0) return null
    return customer.flights[0].status
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Müşteriler</h1>
          <p className="text-muted-foreground">
            Bugün toplam {totalToday} müşteri
          </p>
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
          <div className="flex flex-col sm:flex-row gap-4">
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
              <Button type="submit" variant="secondary">
                Ara
              </Button>
            </form>

            <div className="flex gap-2">
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
                  const flightStatus = getFlightStatus(customer)

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
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
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
