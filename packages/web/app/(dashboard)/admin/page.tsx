'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Plane,
  Clock,
  TrendingUp,
  Camera,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { reportsApi } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

interface DashboardData {
  cards: {
    totalCustomers: number
    totalFlights: number
    completedFlights: number
    activeFlights: number
    waitingCustomers: number
    totalRevenue: number
    mediaRevenue: number
    mediaSoldCount: number
    posRevenue: number
    unpaidTotal: number
  }
  timestamp: string
}

interface ChartData {
  hourlyFlights: { hour: number; count: number }[]
  hourlyCustomers: { hour: number; count: number }[]
  revenueByType: { name: string; value: number }[]
  paymentMethods: { name: string; value: number }[]
}

interface RecentData {
  recentCustomers: {
    id: string
    displayId: string
    firstName: string
    lastName: string
    createdAt: string
    status: string
  }[]
  recentFlights: {
    id: string
    durationMinutes: number
    landingAt: string
    customer: { displayId: string; firstName: string; lastName: string }
    pilot: { name: string }
  }[]
  recentSales: {
    id: string
    itemName: string
    totalPrice: number
    paymentStatus: string
    createdAt: string
    customer: { displayId: string; firstName: string } | null
  }[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const statusColors: Record<string, string> = {
  REGISTERED: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-yellow-100 text-yellow-800',
  IN_FLIGHT: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  REGISTERED: 'Kayıtlı',
  ASSIGNED: 'Atandı',
  IN_FLIGHT: 'Uçuşta',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [recentData, setRecentData] = useState<RecentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { socket, isConnected } = useSocket()

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, chartsRes, recentRes] = await Promise.all([
        reportsApi.getDashboard(),
        reportsApi.getDashboardCharts(),
        reportsApi.getDashboardRecent(),
      ])

      setDashboardData(dashboardRes.data.data)
      setChartData(chartsRes.data.data)
      setRecentData(recentRes.data.data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Dashboard veri hatası:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (!socket) return

    // Listen for real-time updates
    const events = [
      'customer:created',
      'flight:updated',
      'flight:completed',
      'sale:created',
    ]

    events.forEach((event) => {
      socket.on(event, () => {
        fetchData()
      })
    })

    return () => {
      events.forEach((event) => {
        socket.off(event)
      })
    }
  }, [socket, fetchData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const cards = dashboardData?.cards

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yönetim Paneli</h1>
          <p className="text-muted-foreground">
            Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
            {isConnected && (
              <span className="ml-2 inline-flex items-center">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                Canlı
              </span>
            )}
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Link href="/admin/customers">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Müşteriler
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{cards?.totalCustomers || 0}</p>
              <p className="text-xs text-muted-foreground">Bugün kayıtlı</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/flights">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Uçuşlar
              </CardTitle>
              <Plane className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {cards?.completedFlights || 0}/{cards?.totalFlights || 0}
              </p>
              <p className="text-xs text-muted-foreground">Tamamlanan/Toplam</p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktif
            </CardTitle>
            <Plane className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {cards?.activeFlights || 0}
            </p>
            <p className="text-xs text-muted-foreground">Havada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bekleyen
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {cards?.waitingCustomers || 0}
            </p>
            <p className="text-xs text-muted-foreground">Sırada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Medya
            </CardTitle>
            <Camera className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{cards?.mediaSoldCount || 0}</p>
            <p className="text-xs text-muted-foreground">Satılan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              POS
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(cards?.posRevenue || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Bugün</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/sales/daily">
          <Card className="border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-800">
                Toplam Gelir
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">
                {formatCurrency(cards?.totalRevenue || 0)}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-green-600">
                  Medya: {formatCurrency(cards?.mediaRevenue || 0)}
                </span>
                <span className="text-green-600">
                  POS: {formatCurrency(cards?.posRevenue || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/sales/unpaid">
          <Card className="border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-800">
                Ödenmemiş
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-700">
                {formatCurrency(cards?.unpaidTotal || 0)}
              </p>
              <Button variant="link" className="p-0 h-auto text-red-600">
                Detayları gör →
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tahsilat Oranı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cards && (cards.totalRevenue + cards.unpaidTotal) > 0 ? (
              <>
                <p className="text-3xl font-bold">
                  %
                  {(
                    (cards.totalRevenue /
                      (cards.totalRevenue + cards.unpaidTotal)) *
                    100
                  ).toFixed(0)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (cards.totalRevenue /
                          (cards.totalRevenue + cards.unpaidTotal)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="text-3xl font-bold">%100</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saatlik Uçuş Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData?.hourlyFlights && chartData.hourlyFlights.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.hourlyFlights}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h) => `${h}:00`}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(h) => `Saat ${h}:00`}
                    formatter={(value: number) => [`${value} uçuş`, 'Uçuş']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Henüz veri yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gelir Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData?.revenueByType &&
            chartData.revenueByType.some((r) => r.value > 0) ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData.revenueByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.revenueByType.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {chartData.revenueByType.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{entry.name}</span>
                      <span className="text-sm font-medium ml-auto">
                        {formatCurrency(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Henüz gelir yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ödeme Yöntemleri</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData?.paymentMethods &&
            chartData.paymentMethods.some((p) => p.value > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.paymentMethods} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={12} width={60} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Henüz ödeme yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Customer Registration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saatlik Müşteri Kaydı</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData?.hourlyCustomers &&
            chartData.hourlyCustomers.some((c) => c.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData.hourlyCustomers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h) => `${h}:00`}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(h) => `Saat ${h}:00`}
                    formatter={(value: number) => [`${value} müşteri`, 'Kayıt']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Henüz kayıt yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Son Kayıtlar</CardTitle>
            <Link href="/admin/customers">
              <Button variant="ghost" size="sm">
                Tümü →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentData?.recentCustomers &&
            recentData.recentCustomers.length > 0 ? (
              <div className="space-y-3">
                {recentData.recentCustomers.slice(0, 5).map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.displayId}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className={statusColors[customer.status] || ''}
                      >
                        {statusLabels[customer.status] || customer.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(customer.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Henüz müşteri kaydı yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Flights */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Son Uçuşlar</CardTitle>
            <Link href="/admin/flights/list">
              <Button variant="ghost" size="sm">
                Tümü →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentData?.recentFlights && recentData.recentFlights.length > 0 ? (
              <div className="space-y-3">
                {recentData.recentFlights.slice(0, 5).map((flight) => (
                  <div
                    key={flight.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {flight.customer.firstName} {flight.customer.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pilot: {flight.pilot.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {flight.durationMinutes} dk
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(flight.landingAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Henüz tamamlanan uçuş yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Son Satışlar</CardTitle>
            <Link href="/admin/sales/daily">
              <Button variant="ghost" size="sm">
                Tümü →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentData?.recentSales && recentData.recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentData.recentSales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{sale.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.customer?.displayId || 'Misafir'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(sale.totalPrice)}
                      </p>
                      <Badge
                        variant="secondary"
                        className={
                          sale.paymentStatus === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {sale.paymentStatus === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz satış yok</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hızlı Erişim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link href="/customers/new">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Users className="h-5 w-5 mb-1" />
                <span className="text-xs">Yeni Müşteri</span>
              </Button>
            </Link>
            <Link href="/flights/live">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Plane className="h-5 w-5 mb-1" />
                <span className="text-xs">Canlı Uçuşlar</span>
              </Button>
            </Link>
            <Link href="/pos">
              <Button variant="outline" className="w-full h-16 flex-col">
                <ShoppingCart className="h-5 w-5 mb-1" />
                <span className="text-xs">POS Satış</span>
              </Button>
            </Link>
            <Link href="/admin/media/seller">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Camera className="h-5 w-5 mb-1" />
                <span className="text-xs">Medya Satış</span>
              </Button>
            </Link>
            <Link href="/pilots/queue">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Clock className="h-5 w-5 mb-1" />
                <span className="text-xs">Pilot Sırası</span>
              </Button>
            </Link>
            <Link href="/admin/sales/daily">
              <Button variant="outline" className="w-full h-16 flex-col">
                <TrendingUp className="h-5 w-5 mb-1" />
                <span className="text-xs">Kasa Raporu</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
