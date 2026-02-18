'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Users,
  Plane,
  Banknote,
  ArrowRight,
  Minus,
} from 'lucide-react'
import { reportsApi } from '@/lib/api'

interface PeriodData {
  from: string
  to: string
  customers: number
  flights: number
  revenue: number
  transactions: number
  avgSpend: number
}

interface CompareData {
  period1: PeriodData
  period2: PeriodData
  changes: {
    customers: string
    flights: string
    revenue: string
    avgSpend: string
  }
}

export default function CompareReportsPage() {
  const [data, setData] = useState<CompareData | null>(null)
  const [loading, setLoading] = useState(false)

  // Default: This week vs Last week
  const [period1From, setPeriod1From] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })
  const [period1To, setPeriod1To] = useState(() => new Date().toISOString().split('T')[0])
  const [period2From, setPeriod2From] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 13)
    return d.toISOString().split('T')[0]
  })
  const [period2To, setPeriod2To] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await reportsApi.getCompare(period1From, period1To, period2From, period2To)
      setData(res.data.data)
    } catch (error) {
      console.error('Karşılaştırma hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    })
  }

  const getChangeIcon = (change: string) => {
    const value = parseFloat(change)
    if (value > 0) return <TrendingUp className="h-5 w-5 text-green-600" />
    if (value < 0) return <TrendingDown className="h-5 w-5 text-red-600" />
    return <Minus className="h-5 w-5 text-gray-400" />
  }

  const getChangeColor = (change: string) => {
    const value = parseFloat(change)
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  const setPreset = (preset: string) => {
    const today = new Date()

    if (preset === 'week') {
      // This week vs Last week
      const thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - 6)
      const lastWeekStart = new Date(today)
      lastWeekStart.setDate(today.getDate() - 13)
      const lastWeekEnd = new Date(today)
      lastWeekEnd.setDate(today.getDate() - 7)

      setPeriod1From(thisWeekStart.toISOString().split('T')[0])
      setPeriod1To(today.toISOString().split('T')[0])
      setPeriod2From(lastWeekStart.toISOString().split('T')[0])
      setPeriod2To(lastWeekEnd.toISOString().split('T')[0])
    } else if (preset === 'month') {
      // This month vs Last month
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

      setPeriod1From(thisMonthStart.toISOString().split('T')[0])
      setPeriod1To(today.toISOString().split('T')[0])
      setPeriod2From(lastMonthStart.toISOString().split('T')[0])
      setPeriod2To(lastMonthEnd.toISOString().split('T')[0])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dönem Karşılaştırma</h1>
        <p className="text-muted-foreground">İki dönemi karşılaştırarak performans analizi yapın</p>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dönem Seçimi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Presets */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreset('week')}>
                Bu Hafta vs Geçen Hafta
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('month')}>
                Bu Ay vs Geçen Ay
              </Button>
            </div>

            {/* Custom Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Period 1 */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-3 text-blue-800">Dönem 1 (Karşılaştırılan)</h4>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={period1From}
                    onChange={(e) => setPeriod1From(e.target.value)}
                    className="bg-white"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="date"
                    value={period1To}
                    onChange={(e) => setPeriod1To(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Period 2 */}
              <div className="p-4 bg-gray-100 rounded-lg">
                <h4 className="font-medium mb-3 text-gray-700">Dönem 2 (Referans)</h4>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={period2From}
                    onChange={(e) => setPeriod2From(e.target.value)}
                    className="bg-white"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="date"
                    value={period2To}
                    onChange={(e) => setPeriod2To(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            <Button onClick={fetchData} disabled={loading} className="w-full md:w-auto">
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Karşılaştır
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {data && (
        <>
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" /> Müşteri Sayısı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold">{data.period1.customers}</p>
                    <p className="text-sm text-muted-foreground">
                      vs {data.period2.customers}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${getChangeColor(data.changes.customers)}`}>
                    {getChangeIcon(data.changes.customers)}
                    <span className="font-bold">%{data.changes.customers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flights */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Plane className="h-4 w-4" /> Uçuş Sayısı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold">{data.period1.flights}</p>
                    <p className="text-sm text-muted-foreground">
                      vs {data.period2.flights}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${getChangeColor(data.changes.flights)}`}>
                    {getChangeIcon(data.changes.flights)}
                    <span className="font-bold">%{data.changes.flights}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Banknote className="h-4 w-4" /> Toplam Gelir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{formatCurrency(data.period1.revenue)}</p>
                    <p className="text-sm text-muted-foreground">
                      vs {formatCurrency(data.period2.revenue)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${getChangeColor(data.changes.revenue)}`}>
                    {getChangeIcon(data.changes.revenue)}
                    <span className="font-bold">%{data.changes.revenue}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Spend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Ort. Harcama
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{formatCurrency(data.period1.avgSpend)}</p>
                    <p className="text-sm text-muted-foreground">
                      vs {formatCurrency(data.period2.avgSpend)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${getChangeColor(data.changes.avgSpend)}`}>
                    {getChangeIcon(data.changes.avgSpend)}
                    <span className="font-bold">%{data.changes.avgSpend}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detaylı Karşılaştırma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Metrik</th>
                      <th className="text-center py-3 px-4 font-medium bg-blue-50">
                        Dönem 1
                        <div className="text-xs font-normal text-muted-foreground">
                          {formatDate(data.period1.from)} - {formatDate(data.period1.to)}
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium bg-gray-100">
                        Dönem 2
                        <div className="text-xs font-normal text-muted-foreground">
                          {formatDate(data.period2.from)} - {formatDate(data.period2.to)}
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">Değişim</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4">Müşteri Sayısı</td>
                      <td className="py-3 px-4 text-center font-bold bg-blue-50">
                        {data.period1.customers}
                      </td>
                      <td className="py-3 px-4 text-center bg-gray-100">
                        {data.period2.customers}
                      </td>
                      <td className={`py-3 px-4 text-center font-bold ${getChangeColor(data.changes.customers)}`}>
                        %{data.changes.customers}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">Tamamlanan Uçuş</td>
                      <td className="py-3 px-4 text-center font-bold bg-blue-50">
                        {data.period1.flights}
                      </td>
                      <td className="py-3 px-4 text-center bg-gray-100">
                        {data.period2.flights}
                      </td>
                      <td className={`py-3 px-4 text-center font-bold ${getChangeColor(data.changes.flights)}`}>
                        %{data.changes.flights}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">Toplam Gelir</td>
                      <td className="py-3 px-4 text-center font-bold bg-blue-50">
                        {formatCurrency(data.period1.revenue)}
                      </td>
                      <td className="py-3 px-4 text-center bg-gray-100">
                        {formatCurrency(data.period2.revenue)}
                      </td>
                      <td className={`py-3 px-4 text-center font-bold ${getChangeColor(data.changes.revenue)}`}>
                        %{data.changes.revenue}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">İşlem Sayısı</td>
                      <td className="py-3 px-4 text-center font-bold bg-blue-50">
                        {data.period1.transactions}
                      </td>
                      <td className="py-3 px-4 text-center bg-gray-100">
                        {data.period2.transactions}
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">-</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Ortalama Harcama</td>
                      <td className="py-3 px-4 text-center font-bold bg-blue-50">
                        {formatCurrency(data.period1.avgSpend)}
                      </td>
                      <td className="py-3 px-4 text-center bg-gray-100">
                        {formatCurrency(data.period2.avgSpend)}
                      </td>
                      <td className={`py-3 px-4 text-center font-bold ${getChangeColor(data.changes.avgSpend)}`}>
                        %{data.changes.avgSpend}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Karşılaştırma yapmak için dönemleri seçin ve "Karşılaştır" butonuna tıklayın.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
