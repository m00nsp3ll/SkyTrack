'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Clock,
  Plane,
  TrendingUp,
  RefreshCw,
  XCircle,
  CheckCircle,
  Timer,
} from 'lucide-react'
import { reportsApi } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

interface CustomerData {
  summary: {
    totalCustomers: number
    avgWaitTime: number
    avgDuration: number
    cancelRate: string
    avgSpend: number
  }
  dailyCustomers: { date: string; count: number }[]
  hourlyHeatmap: { hour: number; count: number }[]
  statusDistribution: {
    completed: number
    cancelled: number
    registered: number
    assigned: number
    inFlight: number
  }
  dateRange: { from: string; to: string }
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']

export default function CustomerFlowReport() {
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await reportsApi.getCustomers(dateFrom, dateTo)
      setData(res.data.data)
    } catch (error) {
      console.error('Rapor hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleFilter = () => {
    fetchData()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Prepare status distribution for pie chart
  const statusData = data?.statusDistribution
    ? [
        { name: 'Tamamlanan', value: data.statusDistribution.completed, color: '#10b981' },
        { name: 'İptal', value: data.statusDistribution.cancelled, color: '#ef4444' },
        { name: 'Kayıtlı', value: data.statusDistribution.registered, color: '#3b82f6' },
        { name: 'Atanmış', value: data.statusDistribution.assigned, color: '#f59e0b' },
        { name: 'Uçuşta', value: data.statusDistribution.inFlight, color: '#8b5cf6' },
      ].filter((s) => s.value > 0)
    : []

  const cancelRate = parseFloat(data?.summary.cancelRate || '0')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteri Akış Raporu</h1>
          <p className="text-muted-foreground">
            {data?.dateRange && (
              <>
                {formatDate(data.dateRange.from)} - {formatDate(data.dateRange.to)}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
          <Button onClick={handleFilter}>Filtrele</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Müşteri
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.summary.totalCustomers || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ort. Bekleme
            </CardTitle>
            <Timer className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.summary.avgWaitTime || 0} dk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ort. Uçuş Süresi
            </CardTitle>
            <Plane className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.summary.avgDuration || 0} dk</p>
          </CardContent>
        </Card>

        <Card
          className={
            cancelRate > 10
              ? 'border-red-200 bg-red-50'
              : cancelRate > 5
              ? 'border-yellow-200 bg-yellow-50'
              : ''
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              İptal Oranı
            </CardTitle>
            <XCircle
              className={`h-4 w-4 ${
                cancelRate > 10
                  ? 'text-red-600'
                  : cancelRate > 5
                  ? 'text-yellow-600'
                  : 'text-gray-600'
              }`}
            />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                cancelRate > 10
                  ? 'text-red-600'
                  : cancelRate > 5
                  ? 'text-yellow-600'
                  : ''
              }`}
            >
              %{data?.summary.cancelRate || '0'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ort. Harcama
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(data?.summary.avgSpend || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Customer Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Günlük Müşteri Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.dailyCustomers && data.dailyCustomers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.dailyCustomers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(label) => formatDate(label as string)}
                    formatter={(value: number) => [`${value} müşteri`, 'Kayıt']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Durum Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {statusData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm flex-1">{entry.name}</span>
                      <span className="text-sm font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saatlik Müşteri Yoğunluğu</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.hourlyHeatmap && data.hourlyHeatmap.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.hourlyHeatmap}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(h) => `Saat ${h}:00`}
                    formatter={(value: number) => [`${value} müşteri`, 'Kayıt']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.hourlyHeatmap.map((entry, index) => {
                      const maxCount = Math.max(...data.hourlyHeatmap.map((h) => h.count))
                      const intensity = maxCount > 0 ? entry.count / maxCount : 0
                      const color =
                        intensity > 0.7
                          ? '#ef4444'
                          : intensity > 0.4
                          ? '#f59e0b'
                          : '#10b981'
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-sm text-muted-foreground">Düşük</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500" />
                  <span className="text-sm text-muted-foreground">Orta</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span className="text-sm text-muted-foreground">Yoğun</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Veri yok
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Önemli Bilgiler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium">Bekleme Süresi</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Ortalama bekleme süresi {data?.summary.avgWaitTime || 0} dakika.
                {(data?.summary.avgWaitTime || 0) > 30
                  ? ' Bu süre uzun sayılır, pilot sayısını artırmayı düşünün.'
                  : ' Bu süre kabul edilebilir seviyede.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-medium">İptal Oranı</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                İptal oranı %{data?.summary.cancelRate || '0'}.
                {cancelRate > 10
                  ? ' Bu oran yüksek, iptal nedenlerini araştırın.'
                  : cancelRate > 5
                  ? ' Bu oran orta seviyede, iyileştirme yapılabilir.'
                  : ' Bu oran düşük, iyi bir performans.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">Müşteri Harcaması</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Ortalama harcama {formatCurrency(data?.summary.avgSpend || 0)}.
                {(data?.summary.avgSpend || 0) > 500
                  ? ' Bu iyi bir harcama ortalaması.'
                  : ' Çapraz satış fırsatlarını değerlendirin.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
