'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Camera,
  ShoppingCart,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Users,
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
  Legend,
  ComposedChart,
  Area,
} from 'recharts'

interface RevenueData {
  summary: {
    totalRevenue: number
    mediaRevenue: number
    posRevenue: number
    collected: number
    uncollected: number
    collectionRate: string
  }
  categories: Record<string, number>
  dailyTrend: { date: string; pos: number; media: number }[]
  topProducts: { name: string; total: number }[]
  topStaff: { id: string; name: string; total: number; count: number }[]
  dateRange: { from: string; to: string }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function RevenueReport() {
  const [data, setData] = useState<RevenueData | null>(null)
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
      const res = await reportsApi.getRevenue(dateFrom, dateTo)
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

  // Prepare category data for pie chart
  const categoryData = data?.categories
    ? Object.entries(data.categories).map(([name, value]) => ({ name, value }))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gelir Raporu</h1>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Toplam Gelir
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-700">
              {formatCurrency(data?.summary.totalRevenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Foto/Video Geliri
            </CardTitle>
            <Camera className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(data?.summary.mediaRevenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              POS Geliri
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(data?.summary.posRevenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tahsil Edilen
            </CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(data?.summary.collected || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              Tahsil Edilmeyen
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-red-700">
              {formatCurrency(data?.summary.uncollected || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tahsilat Oranı
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">%{data?.summary.collectionRate || '100'}</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-green-600 h-1.5 rounded-full"
                style={{ width: `${data?.summary.collectionRate || 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Günlük Gelir Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.dailyTrend && data.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(label) => formatDate(label as string)}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="pos"
                    fill="#10b981"
                    fillOpacity={0.3}
                    stroke="#10b981"
                    name="POS"
                  />
                  <Area
                    type="monotone"
                    dataKey="media"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                    stroke="#8b5cf6"
                    name="Medya"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kategori Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 max-h-[250px] overflow-y-auto">
                  {categoryData.slice(0, 8).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm truncate flex-1">{entry.name}</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(entry.value)}
                      </span>
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">En Çok Satan Ürünler</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topProducts && data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    fontSize={11}
                    width={150}
                    tick={{ textAnchor: 'end' }}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Personel Satış Performansı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topStaff && data.topStaff.length > 0 ? (
              <div className="space-y-3">
                {data.topStaff.map((staff, index) => {
                  const maxTotal = data.topStaff[0]?.total || 1
                  const percentage = (staff.total / maxTotal) * 100
                  return (
                    <Link
                      key={staff.id}
                      href={`/admin/reports/staff-sales?staffId=${staff.id}&staffName=${encodeURIComponent(staff.name)}`}
                      className="block space-y-1 hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </div>
                          <span className="font-medium hover:text-primary transition-colors">{staff.name}</span>
                          <span className="text-xs text-muted-foreground">({staff.count} satış)</span>
                        </div>
                        <span className="font-bold text-primary">{formatCurrency(staff.total)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Split Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gelir Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Foto/Video Satışları</span>
                </div>
                <span className="text-xl font-bold">
                  {formatCurrency(data?.summary.mediaRevenue || 0)}
                </span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-4">
                <div
                  className="bg-purple-600 h-4 rounded-full"
                  style={{
                    width: `${
                      data?.summary.totalRevenue
                        ? ((data.summary.mediaRevenue || 0) / data.summary.totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Toplam gelirin %
                {data?.summary.totalRevenue
                  ? (((data.summary.mediaRevenue || 0) / data.summary.totalRevenue) * 100).toFixed(0)
                  : 0}
                'i
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-teal-600" />
                  <span className="font-medium">POS Satışları</span>
                </div>
                <span className="text-xl font-bold">
                  {formatCurrency(data?.summary.posRevenue || 0)}
                </span>
              </div>
              <div className="w-full bg-teal-100 rounded-full h-4">
                <div
                  className="bg-teal-600 h-4 rounded-full"
                  style={{
                    width: `${
                      data?.summary.totalRevenue
                        ? ((data.summary.posRevenue || 0) / data.summary.totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Toplam gelirin %
                {data?.summary.totalRevenue
                  ? (((data.summary.posRevenue || 0) / data.summary.totalRevenue) * 100).toFixed(0)
                  : 0}
                'i
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
