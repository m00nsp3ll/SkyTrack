'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  Award,
  AlertTriangle,
  CheckCircle,
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
} from 'recharts'

interface PilotStats {
  id: string
  name: string
  totalFlights: number
  avgDuration: number
  totalCustomers: number
  avgDailyFlights: string
  cancelledFlights: number
  activeDays: number
  performanceScore: string
}

interface FairnessData {
  maxMinDiff: number
  standardDeviation: string
  balanceScore: string
}

interface ReportData {
  pilots: PilotStats[]
  fairness: FairnessData
  dateRange: { from: string; to: string }
}

type QuickFilter = 'today' | 'week' | 'month' | 'custom'

function getQuickDates(filter: QuickFilter): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().split('T')[0]
  if (filter === 'today') {
    return { from: to, to }
  }
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
  // custom — caller handles
  const d = new Date(today)
  d.setDate(d.getDate() - 30)
  return { from: d.toISOString().split('T')[0], to }
}

export default function PilotPerformanceReport() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month')
  const [dateFrom, setDateFrom] = useState(() => getQuickDates('month').from)
  const [dateTo, setDateTo] = useState(() => getQuickDates('month').to)

  const fetchData = async (from: string, to: string) => {
    setLoading(true)
    try {
      const res = await reportsApi.getPilots(from, to)
      setData(res.data.data)
    } catch (error) {
      console.error('Rapor hatası:', error)
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const balanceScore = parseFloat(data?.fairness.balanceScore || '0')
  const balanceStatus =
    balanceScore >= 80 ? 'excellent' : balanceScore >= 60 ? 'good' : 'poor'

  const flightChartData = data?.pilots.map((p) => ({
    name: p.name,
    flights: p.totalFlights,
    cancelled: p.cancelledFlights,
  })) || []

  const durationChartData = data?.pilots.map((p) => ({
    name: p.name,
    avgDuration: p.avgDuration,
  })) || []

  const quickButtons: { label: string; value: QuickFilter }[] = [
    { label: 'Bugün', value: 'today' },
    { label: 'Bu Hafta', value: 'week' },
    { label: 'Bu Ay', value: 'month' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pilot Performans Raporu</h1>
          <p className="text-muted-foreground">
            {data?.dateRange && (
              <>
                {formatDate(data.dateRange.from)} - {formatDate(data.dateRange.to)}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick filter buttons */}
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

      {/* Fairness Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={
            balanceStatus === 'excellent'
              ? 'border-green-200 bg-green-50'
              : balanceStatus === 'good'
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Denge Skoru</CardTitle>
            {balanceStatus === 'excellent' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : balanceStatus === 'good' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">%{data?.fairness.balanceScore || '0'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {balanceStatus === 'excellent'
                ? 'Mükemmel dağılım'
                : balanceStatus === 'good'
                ? 'İyi dağılım'
                : 'Dengesiz dağılım'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Max-Min Fark</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.fairness.maxMinDiff || 0}</p>
            <p className="text-xs text-muted-foreground">Uçuş farkı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Std. Sapma</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.fairness.standardDeviation || '0'}</p>
            <p className="text-xs text-muted-foreground">Uçuş dağılımı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Pilot</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.pilots.length || 0}</p>
            <p className="text-xs text-muted-foreground">Aktif pilot</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilot Bazında Uçuş Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            {flightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={flightChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="flights" fill="#3b82f6" name="Tamamlanan" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" fill="#ef4444" name="İptal" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ortalama Uçuş Süresi (dk)</CardTitle>
          </CardHeader>
          <CardContent>
            {durationChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={durationChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={12} width={80} />
                  <Tooltip formatter={(value: number) => `${value} dk`} />
                  <Bar dataKey="avgDuration" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pilot Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            Pilot Performans Tablosu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-sm">#</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Pilot</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Toplam Uçuş</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Ort. Süre</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Günlük Ort.</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Aktif Gün</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">İptal</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Performans</th>
                </tr>
              </thead>
              <tbody>
                {data?.pilots.map((pilot, index) => (
                  <tr key={pilot.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      {index === 0 && <span className="text-yellow-500 text-lg">🥇</span>}
                      {index === 1 && <span className="text-gray-400 text-lg">🥈</span>}
                      {index === 2 && <span className="text-amber-600 text-lg">🥉</span>}
                      {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                    </td>
                    <td className="py-3 px-2 font-medium">
                      <Link
                        href={`/admin/reports/pilots/${pilot.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {pilot.name}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-bold text-blue-600">{pilot.totalFlights}</span>
                    </td>
                    <td className="py-3 px-2 text-center">{pilot.avgDuration} dk</td>
                    <td className="py-3 px-2 text-center">{pilot.avgDailyFlights}</td>
                    <td className="py-3 px-2 text-center">{pilot.activeDays}</td>
                    <td className="py-3 px-2 text-center">
                      {pilot.cancelledFlights > 0 ? (
                        <Badge variant="destructive">{pilot.cancelledFlights}</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          0
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge
                        variant="secondary"
                        className={
                          parseFloat(pilot.performanceScore) >= 5
                            ? 'bg-green-100 text-green-800'
                            : parseFloat(pilot.performanceScore) >= 3
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {pilot.performanceScore}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Denge Skoru</h4>
              <p className="text-muted-foreground">
                Pilotlar arasındaki uçuş dağılımının ne kadar adil olduğunu gösterir.
                %80 üzeri mükemmel, %60-80 iyi, %60 altı dengesiz kabul edilir.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Standart Sapma</h4>
              <p className="text-muted-foreground">
                Pilotlar arasındaki uçuş sayısı farkının istatistiksel ölçümü.
                Düşük değer daha adil dağılım anlamına gelir.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performans Skoru</h4>
              <p className="text-muted-foreground">
                Günlük ortalama uçuş sayısı. 5+ mükemmel, 3-5 iyi, 3 altı düşük performans.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
