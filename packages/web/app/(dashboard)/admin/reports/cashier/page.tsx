'use client'

import { useEffect, useState } from 'react'
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
  Receipt,
  Award,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Building,
} from 'lucide-react'

interface StaffData {
  id: string
  name: string
  total: number
  count: number
  paid: number
  avgSale: number
}

interface CashierReportData {
  staffList: StaffData[]
  dateRange: { from: string; to: string }
}

const roleColors: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700' },
  OFFICE_STAFF: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MEDIA_SELLER: { bg: 'bg-orange-100', text: 'text-orange-700' },
  PILOT: { bg: 'bg-green-100', text: 'text-green-700' },
}

export default function CashierReportPage() {
  const [data, setData] = useState<CashierReportData | null>(null)
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
      const res = await api.get(`/reports/staff-sales?from=${dateFrom}&to=${dateTo}`)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalRevenue = data?.staffList.reduce((sum, s) => sum + s.total, 0) || 0
  const totalSales = data?.staffList.reduce((sum, s) => sum + s.count, 0) || 0
  const topSeller = data?.staffList[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Vezne Raporu
          </h1>
          <p className="text-muted-foreground">
            Personel satış performansı ve vezne özeti
            {data?.dateRange && (
              <> • {formatDate(data.dateRange.from)} - {formatDate(data.dateRange.to)}</>
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
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">{data?.staffList.length || 0}</p>
            <p className="text-xs text-blue-600">Aktif Personel</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-green-600">Toplam Gelir</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4 text-center">
            <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-700">{totalSales}</p>
            <p className="text-xs text-purple-600">Toplam Satış</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-4 text-center">
            <Award className="h-6 w-6 mx-auto mb-2 text-amber-600" />
            <p className="text-xl font-bold text-amber-700 truncate">
              {topSeller?.name || '-'}
            </p>
            <p className="text-xs text-amber-600">En Başarılı</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.staffList && data.staffList.length > 0 ? (
          data.staffList.map((staff, index) => {
            const percentage = totalRevenue > 0 ? (staff.total / totalRevenue) * 100 : 0
            const isTopPerformer = index < 3

            return (
              <Link
                key={staff.id}
                href={`/admin/reports/staff-sales?staffId=${staff.id}&staffName=${encodeURIComponent(staff.name)}`}
              >
                <Card className={`hover:shadow-lg transition-all cursor-pointer ${
                  isTopPerformer ? 'border-primary border-2' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isTopPerformer && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              'bg-orange-400 text-orange-900'
                            }`}>
                              {index + 1}
                            </div>
                          )}
                          <CardTitle className="text-lg">{staff.name}</CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {staff.count} satış • Ortalama: {formatCurrency(staff.avgSale)}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Toplam Gelir</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(staff.total)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Katkı Oranı</span>
                        <span className="font-semibold">%{percentage.toFixed(1)}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Ödenen Satış</span>
                        <span className="font-semibold text-green-600">{staff.paid} / {staff.count}</span>
                      </div>

                      {isTopPerformer && (
                        <div className={`text-center py-1 rounded text-xs font-medium ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {index === 0 ? '🥇 En İyi Performans' :
                           index === 1 ? '🥈 İkinci Sıra' :
                           '🥉 Üçüncü Sıra'}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Seçilen tarih aralığında satış bulunamadı</p>
          </div>
        )}
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylı Performans Tablosu</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.staffList && data.staffList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">#</th>
                    <th className="pb-3 font-medium">Personel</th>
                    <th className="pb-3 font-medium text-center">Toplam Satış</th>
                    <th className="pb-3 font-medium text-center">Ödenen</th>
                    <th className="pb-3 font-medium text-right">Toplam Gelir</th>
                    <th className="pb-3 font-medium text-right">Ortalama Satış</th>
                    <th className="pb-3 font-medium text-center">Katkı</th>
                    <th className="pb-3 font-medium text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.staffList.map((staff, index) => {
                    const percentage = totalRevenue > 0 ? (staff.total / totalRevenue) * 100 : 0
                    return (
                      <tr key={staff.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-3 font-medium">{staff.name}</td>
                        <td className="py-3 text-center">{staff.count}</td>
                        <td className="py-3 text-center">
                          <span className="text-green-600 font-medium">{staff.paid}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({staff.count > 0 ? ((staff.paid / staff.count) * 100).toFixed(0) : 0}%)
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-primary">
                          {formatCurrency(staff.total)}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">
                          {formatCurrency(staff.avgSale)}
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            %{percentage.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <Link href={`/admin/reports/staff-sales?staffId=${staff.id}&staffName=${encodeURIComponent(staff.name)}`}>
                            <Button size="sm" variant="outline">
                              Detay
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-3" colSpan={2}>TOPLAM</td>
                    <td className="py-3 text-center">{totalSales}</td>
                    <td className="py-3 text-center">
                      {data.staffList.reduce((sum, s) => sum + s.paid, 0)}
                    </td>
                    <td className="py-3 text-right text-primary">{formatCurrency(totalRevenue)}</td>
                    <td className="py-3 text-right">
                      {totalSales > 0 ? formatCurrency(totalRevenue / totalSales) : '-'}
                    </td>
                    <td className="py-3 text-center">%100</td>
                    <td className="py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Veri yok</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
