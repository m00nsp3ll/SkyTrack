'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { salesApi } from '@/lib/api'
import {
  Banknote,
  CreditCard,
  Building,
  Clock,
  Camera,
  RefreshCw,
  TrendingUp,
  Receipt,
  PieChart,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'

interface DailyReport {
  date: string
  summary: {
    totalSales: number
    cashSales: number
    cardSales: number
    transferSales: number
    unpaidSales: number
    mediaSales: number
    paidTotal: number
    transactionCount: number
  }
  categories: Record<string, { count: number; total: number }>
  paymentMethods: {
    CASH: number
    CREDIT_CARD: number
    TRANSFER: number
    UNPAID: number
  }
  hourly: { hour: number; amount: number }[]
  sales: any[]
}

export default function DailyReportPage() {
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const response = await salesApi.getDailyReport(selectedDate)
      setReport(response.data.data)
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [selectedDate])

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} ₺`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const summary = report?.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Günlük Kasa Raporu</h1>
          <p className="text-muted-foreground">
            {new Date(selectedDate).toLocaleDateString('tr-TR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <Button variant="outline" onClick={fetchReport}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/admin/sales/unpaid">
            <Button variant="outline">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Ödenmemişler
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{formatCurrency(summary?.paidTotal || 0)}</p>
            <p className="text-xs text-green-600">Ödenen Toplam</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <Banknote className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.cashSales || 0)}</p>
            <p className="text-xs text-green-600">Nakit</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <CreditCard className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.cardSales || 0)}</p>
            <p className="text-xs text-blue-600">Kredi Kartı</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Building className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(summary?.transferSales || 0)}</p>
            <p className="text-xs text-muted-foreground">Havale</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary?.unpaidSales || 0)}</p>
            <p className="text-xs text-yellow-600">Veresiye</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <Camera className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary?.mediaSales || 0)}</p>
            <p className="text-xs text-purple-600">Medya</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Kategori Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report?.categories && Object.keys(report.categories).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(report.categories).map(([category, data]) => {
                  const percentage = summary?.totalSales
                    ? ((data.total / summary.totalSales) * 100).toFixed(1)
                    : 0
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground">({data.count} adet)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(data.total)}</span>
                        <span className="text-sm text-muted-foreground ml-2">%{percentage}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Veri yok</p>
            )}
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Saatlik Dağılım
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report?.hourly && report.hourly.some(h => h.amount > 0) ? (
              <div className="space-y-2">
                {report.hourly
                  .filter(h => h.amount > 0)
                  .map((hour) => {
                    const maxAmount = Math.max(...report.hourly.map(h => h.amount))
                    const percentage = maxAmount > 0 ? (hour.amount / maxAmount) * 100 : 0
                    return (
                      <div key={hour.hour} className="flex items-center gap-3">
                        <span className="w-12 text-sm text-muted-foreground">
                          {hour.hour.toString().padStart(2, '0')}:00
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-sm font-medium">
                          {formatCurrency(hour.amount)}
                        </span>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Veri yok</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            İşlem Detayları ({summary?.transactionCount || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report?.sales && report.sales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Müşteri</th>
                    <th className="pb-3 font-medium">Ürün</th>
                    <th className="pb-3 font-medium">Satışı Yapan</th>
                    <th className="pb-3 font-medium">Saat</th>
                    <th className="pb-3 font-medium text-center">Adet</th>
                    <th className="pb-3 font-medium text-right">Tutar</th>
                    <th className="pb-3 font-medium text-center">Ödeme</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.slice(0, 50).map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        {sale.customer ? (
                          <span className="text-sm font-medium">{sale.customer.displayId}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-sm">{sale.itemName}</span>
                        <span className="text-xs text-muted-foreground ml-2">({sale.itemType})</span>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/reports/staff-sales?staffId=${sale.soldBy?.id}&staffName=${encodeURIComponent(sale.soldBy?.username || '')}`}
                          className="text-sm font-medium text-primary hover:underline cursor-pointer"
                        >
                          {sale.soldBy?.username || '-'}
                        </Link>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 text-center text-sm">{sale.quantity}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(sale.totalPrice)}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            sale.paymentStatus === 'PAID'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {sale.paymentStatus === 'PAID'
                            ? sale.paymentMethod === 'CASH'
                              ? 'Nakit'
                              : sale.paymentMethod === 'CREDIT_CARD'
                              ? 'Kart'
                              : 'Havale'
                            : 'Bekliyor'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.sales.length > 50 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  +{report.sales.length - 50} daha fazla işlem...
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Bugün işlem yapılmamış</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
