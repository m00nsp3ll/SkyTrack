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
import { printLabel } from '@/lib/labelPrint'
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
    totalAmountEUR?: number
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

function generateDemoQR(text: string, size = 200): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Simple QR-like pattern for demo (real QR would need a library)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#000000'

  // Generate a deterministic pattern from text
  const cellCount = 25
  const cellSize = size / cellCount
  const hash = text.split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)

  // Position detection patterns (3 corners)
  const drawFinder = (x: number, y: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        if (isOuter || isInner) {
          ctx.fillRect((x + c) * cellSize, (y + r) * cellSize, cellSize, cellSize)
        }
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(cellCount - 7, 0)
  drawFinder(0, cellCount - 7)

  // Fill data area with pseudo-random pattern
  let seed = Math.abs(hash)
  for (let r = 0; r < cellCount; r++) {
    for (let c = 0; c < cellCount; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c > cellCount - 9) || (r > cellCount - 9 && c < 8)
      if (inFinder) continue
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      if (seed % 3 !== 0) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
      }
    }
  }

  return canvas.toDataURL('image/png')
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [recentData, setRecentData] = useState<RecentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [demoQR, setDemoQR] = useState<string>('')
  const { socket } = useSocket()

  useEffect(() => {
    setDemoQR(generateDemoQR('http://192.168.1.100/c/T0060'))
  }, [])

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
      currency: 'EUR',
      minimumFractionDigits: 2,
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
            {socket?.connected && (
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
              Foto/Video
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
                  Foto/Video: {formatCurrency(cards?.mediaRevenue || 0)}
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
                        {formatCurrency(sale.totalAmountEUR || sale.totalPrice)}
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
            <Link href="/admin/customers/new">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Users className="h-5 w-5 mb-1" />
                <span className="text-xs">Yeni Müşteri</span>
              </Button>
            </Link>
            <Link href="/admin/flights/list">
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
            <Link href="/admin/pilots/queue">
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

      {/* Etiket Yazıcı Test — inline template (cache bypass) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Etiket Test (7x5cm)</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => {
              if (!demoQR) return
              const now = new Date()
              const ds = now.toLocaleDateString('tr-TR')
              const ts = now.toLocaleTimeString('tr-TR')
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Kod - T0060</title><style>@page{size:auto;margin:0}@media print{html,body{margin:0;padding:0}}body{font-family:Arial,sans-serif;text-align:center;padding:2px;margin:0}.qr-container{width:3cm;margin:0 auto;padding:2px}.qr-code{width:2.2cm;height:2.2cm}.display-id{font-size:8px;font-weight:bold;margin-top:1px}.customer-name{font-size:7px;color:#666}.pilot-name{font-size:7px;font-weight:bold;color:#333;margin-top:1px}.datetime{font-size:6px;color:#888;margin-top:1px}</style></head><body><div class="qr-container"><img src="${demoQR}" class="qr-code"/><div class="display-id">T0060</div><div class="customer-name">Elas Aidukas</div><div class="pilot-name">Pilot: Mehmet Ermetin</div><div class="datetime">${ds} - ${ts}</div></div><script>window.onload=()=>{setTimeout(()=>window.print(),200)};</script></body></html>`
              const w = window.open('', '_blank', 'width=300,height=200')
              if (!w) return
              w.document.write(html)
              w.document.close()
              const img = w.document.querySelector('img')
              const go = () => { w.focus(); w.print() }
              if (img && !img.complete) { img.onload = () => setTimeout(go, 200) }
              else { w.onload = () => setTimeout(go, 200) }
            }}
            className="border-2 border-dashed border-blue-400 rounded-lg p-4 hover:bg-blue-50 transition-colors w-full max-w-sm mx-auto block"
          >
            <div className="text-sm font-bold mb-2 text-center">Test Etiketi Yazdir</div>
            <div className="border rounded bg-white p-2 mx-auto" style={{ width: '120px', height: '160px' }}>
              <div className="flex flex-col h-full items-center justify-center">
                <div className="text-[10px] font-bold">T0060</div>
                <div className="text-[6px] text-gray-500">Elas Aidukas</div>
                <div className="text-[6px] font-bold">Pilot: Mehmet</div>
                {demoQR ? (
                  <img src={demoQR} alt="QR" className="w-14 h-14 mt-1" />
                ) : (
                  <div className="w-14 h-14 bg-gray-800 rounded mt-1" />
                )}
                <div className="text-[5px] text-gray-400 mt-1">18.04.2026</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">7x5cm — yazi ust, QR alt, %100 scale</div>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
