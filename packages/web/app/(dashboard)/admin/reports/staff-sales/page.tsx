'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import {
  Users,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  ArrowLeft,
  Banknote,
  CreditCard,
  Building,
  Clock,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  X,
} from 'lucide-react'

interface StaffSalesData {
  staff: {
    id: string
    username: string
    name: string | null
    role: string
  }
  summary: {
    totalSales: number
    totalRevenue: number
    totalUnpaid: number
    avgSaleAmount: number
    collectionRate: string
  }
  categories: Record<string, { count: number; total: number }>
  dailySales: { date: string; amount: number; count: number }[]
  hourlySales: { hour: number; amount: number }[]
  paymentMethods: {
    CASH: number
    CREDIT_CARD: number
    TRANSFER: number
  }
  recentSales: any[]
  dateRange: { from: string; to: string }
}

export default function StaffSalesPage() {
  const searchParams = useSearchParams()
  const staffId = searchParams.get('staffId')
  const staffName = searchParams.get('staffName')

  const [data, setData] = useState<StaffSalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showUnpaidModal, setShowUnpaidModal] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const fetchData = async () => {
    if (!staffId) return
    setLoading(true)
    try {
      const res = await api.get(`/reports/staff-sales?staffId=${staffId}&from=${dateFrom}&to=${dateTo}`)
      setData(res.data.data)
    } catch (error) {
      console.error('Rapor hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [staffId])

  const handleFilter = () => {
    fetchData()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
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

  if (!staffId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Personel seçilmedi</p>
          <Link href="/admin/sales/daily">
            <Button className="mt-4">Günlük Rapora Dön</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Veri yüklenemedi</p>
          <Button onClick={fetchData} className="mt-4">Tekrar Dene</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/sales/daily">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              {data.staff.name || data.staff.username}
            </h1>
            <p className="text-muted-foreground">
              Personel Satış Performansı • {formatDate(data.dateRange.from)} - {formatDate(data.dateRange.to)}
            </p>
          </div>
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
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 text-center">
            <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">{data.summary.totalSales}</p>
            <p className="text-xs text-blue-600">Toplam Satış</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{formatCurrency(data.summary.totalRevenue)}</p>
            <p className="text-xs text-green-600">Toplam Gelir</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(data.summary.avgSaleAmount)}</p>
            <p className="text-xs text-muted-foreground">Ortalama Satış</p>
          </CardContent>
        </Card>

        <Card
          className="bg-red-50 border-red-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setShowUnpaidModal(true)}
        >
          <CardContent className="pt-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold text-red-700">{formatCurrency(data.summary.totalUnpaid)}</p>
            <p className="text-xs text-red-600">Bekleyen Ödeme</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">%{data.summary.collectionRate}</p>
            <p className="text-xs text-muted-foreground">Tahsilat Oranı</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ödeme Yöntemleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Nakit</span>
                  </div>
                  <span className="text-xl font-bold">{formatCurrency(data.paymentMethods.CASH)}</span>
                </div>
                <div className="w-full bg-green-100 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full"
                    style={{
                      width: `${
                        data.summary.totalRevenue > 0
                          ? (data.paymentMethods.CASH / data.summary.totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Kredi Kartı</span>
                  </div>
                  <span className="text-xl font-bold">{formatCurrency(data.paymentMethods.CREDIT_CARD)}</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{
                      width: `${
                        data.summary.totalRevenue > 0
                          ? (data.paymentMethods.CREDIT_CARD / data.summary.totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    <span className="font-medium">Havale</span>
                  </div>
                  <span className="text-xl font-bold">{formatCurrency(data.paymentMethods.TRANSFER)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full"
                    style={{
                      width: `${
                        data.summary.totalRevenue > 0
                          ? (data.paymentMethods.TRANSFER / data.summary.totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Category-based Sales (Replaces Recent Sales) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Kategori Bazlı Satışlar ({data.recentSales.length} satış)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Kategorilere tıklayarak detaylı satışları görüntüleyin
          </p>
        </CardHeader>
        <CardContent>
          {Object.keys(data.categories).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(data.categories)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([category, stats]) => {
                  const maxTotal = Math.max(...Object.values(data.categories).map(c => c.total))
                  const percentage = (stats.total / maxTotal) * 100
                  const isExpanded = expandedCategory === category
                  const categorySales = data.recentSales.filter(s => s.itemType === category)

                  return (
                    <div key={category} className="border-2 rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : category)}
                        className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isExpanded ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-lg">{category}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm text-muted-foreground">{stats.count} satış</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-sm text-green-600 font-medium">{formatCurrency(stats.total)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.total)}</div>
                            <div className="text-xs text-muted-foreground">%{((stats.total / data.summary.totalRevenue) * 100).toFixed(1)} katkı</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div
                            className="bg-primary h-3 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t-2 bg-gray-50">
                          <div className="p-4">
                            {categorySales.length > 0 ? (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {categorySales.map((sale) => (
                                  <div key={sale.id} className="flex items-center justify-between bg-white p-3 rounded-lg border hover:border-primary/50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-1">
                                        {sale.customer ? (
                                          <Link
                                            href={`/admin/customers/${sale.customer.displayId}`}
                                            className="font-semibold text-primary hover:underline flex items-center gap-1.5"
                                          >
                                            <User className="h-4 w-4" />
                                            {sale.customer.displayId}
                                          </Link>
                                        ) : (
                                          <span className="text-muted-foreground font-medium">Müşterisiz Satış</span>
                                        )}
                                        <span className="text-sm text-muted-foreground">→</span>
                                        <span className="text-sm font-medium truncate">
                                          {sale.itemName}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(sale.createdAt).toLocaleString('tr-TR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                        <span>•</span>
                                        <span>{sale.quantity} adet</span>
                                        <span>•</span>
                                        <span className={`px-2 py-0.5 rounded ${
                                          sale.paymentStatus === 'PAID'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {sale.paymentStatus === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right ml-4">
                                      <div className="text-lg font-bold text-primary">{formatCurrency(sale.totalPrice)}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Birim: {formatCurrency(sale.unitPrice)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-center text-muted-foreground py-8">Bu kategoride satış bulunamadı</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Henüz satış yapılmamış</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unpaid Sales Modal */}
      {showUnpaidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUnpaidModal(false)}>
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-red-50">
              <div>
                <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Bekleyen Ödemeler
                </h2>
                <p className="text-sm text-red-600 mt-1">
                  {data.recentSales.filter(s => s.paymentStatus === 'UNPAID').length} satış • Toplam {formatCurrency(data.summary.totalUnpaid)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowUnpaidModal(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {data.recentSales.filter(s => s.paymentStatus === 'UNPAID').length > 0 ? (
                <div className="space-y-3">
                  {data.recentSales
                    .filter(s => s.paymentStatus === 'UNPAID')
                    .map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between bg-white p-4 rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {sale.customer ? (
                              <Link
                                href={`/admin/customers/${sale.customer.displayId}`}
                                className="font-semibold text-primary hover:underline flex items-center gap-1.5"
                                onClick={() => setShowUnpaidModal(false)}
                              >
                                <User className="h-4 w-4" />
                                {sale.customer.displayId}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground font-medium">Müşterisiz Satış</span>
                            )}
                            <span className="text-sm text-muted-foreground">→</span>
                            <span className="text-sm font-medium truncate">
                              {sale.itemName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(sale.createdAt).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>•</span>
                            <span>{sale.quantity} adet</span>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded bg-gray-100">
                              {sale.itemType}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xl font-bold text-red-600">{formatCurrency(sale.totalPrice)}</div>
                          <div className="text-xs text-muted-foreground">
                            Birim: {formatCurrency(sale.unitPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Bekleyen ödeme bulunmuyor</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {data.recentSales.filter(s => s.paymentStatus === 'UNPAID').length} adet ödenmemiş satış
                </div>
                <Button onClick={() => setShowUnpaidModal(false)}>
                  Kapat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
