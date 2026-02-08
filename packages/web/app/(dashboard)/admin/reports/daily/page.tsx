'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Plane,
  Camera,
  ShoppingCart,
  RefreshCw,
  Printer,
  Calendar,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react'
import { reportsApi } from '@/lib/api'

interface DailyReportData {
  date: string
  customerSummary: {
    registered: number
    completed: number
    cancelled: number
  }
  pilotSummary: Record<string, { flights: number; completed: number }>
  flightSummary: {
    total: number
    completed: number
    cancelled: number
    avgDuration: number
    maxDuration: number
    minDuration: number
  }
  cashSummary: {
    cash: number
    card: number
    transfer: number
    unpaid: number
    total: number
  }
  mediaSummary: {
    uploaded: number
    sold: number
    delivered: number
    revenue: number
    totalFiles: number
  }
  posSummary: Record<string, number>
  lowStockProducts: { id: string; name: string; stock: number; lowStockAlert: number }[]
}

export default function DailyOperationsReport() {
  const [data, setData] = useState<DailyReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await reportsApi.getDaily(selectedDate)
      setData(res.data.data)
    } catch (error) {
      console.error('Rapor hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalRevenue = (data?.cashSummary.total || 0) + (data?.mediaSummary.revenue || 0)

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Günlük Operasyon Raporu</h1>
          <p className="text-muted-foreground">{data?.date && formatDate(data.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">SkyTrack - Günlük Operasyon Raporu</h1>
        <p className="text-sm">{data?.date && formatDate(data.date)}</p>
      </div>

      {/* Customer & Flight Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 print:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Kayıtlı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.customerSummary.registered || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Plane className="h-3 w-3" /> Uçuş
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data?.flightSummary.completed || 0}/{data?.flightSummary.total || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Ort. Süre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.flightSummary.avgDuration || 0} dk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Camera className="h-3 w-3" /> Medya
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data?.mediaSummary.sold || 0}/{data?.mediaSummary.uploaded || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-red-600">İptal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {data?.customerSummary.cancelled || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-green-800">Toplam Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Register Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5" /> Kasa Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Banknote className="h-6 w-6 mx-auto text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground">Nakit</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(data?.cashSummary.cash || 0)}
              </p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <CreditCard className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground">Kredi Kartı</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(data?.cashSummary.card || 0)}
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <ArrowRightLeft className="h-6 w-6 mx-auto text-purple-600 mb-2" />
              <p className="text-sm text-muted-foreground">Havale</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(data?.cashSummary.transfer || 0)}
              </p>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-2" />
              <p className="text-sm text-muted-foreground">Veresiye</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(data?.cashSummary.unpaid || 0)}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 mx-auto text-gray-600 mb-2" />
              <p className="text-sm text-muted-foreground">POS Toplam</p>
              <p className="text-xl font-bold">{formatCurrency(data?.cashSummary.total || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pilot Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Pilot Performansı
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.pilotSummary && Object.keys(data.pilotSummary).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-sm">Pilot</th>
                    <th className="text-center py-2 px-3 font-medium text-sm">Toplam</th>
                    <th className="text-center py-2 px-3 font-medium text-sm">Tamamlanan</th>
                    <th className="text-center py-2 px-3 font-medium text-sm">Oran</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.pilotSummary)
                    .sort((a, b) => b[1].completed - a[1].completed)
                    .map(([name, stats]) => (
                      <tr key={name} className="border-b">
                        <td className="py-2 px-3 font-medium">{name}</td>
                        <td className="py-2 px-3 text-center">{stats.flights}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-bold text-green-600">{stats.completed}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge
                            variant="secondary"
                            className={
                              stats.flights > 0 && stats.completed / stats.flights >= 0.9
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            %{stats.flights > 0 ? Math.round((stats.completed / stats.flights) * 100) : 0}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Bugün uçuş kaydı yok</p>
          )}
        </CardContent>
      </Card>

      {/* Media & POS Summary Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        {/* Media Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" /> Medya Özeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Yüklenen Klasör</span>
                <span className="font-bold">{data?.mediaSummary.uploaded || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Satılan</span>
                <span className="font-bold text-green-600">{data?.mediaSummary.sold || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Teslim Edilen</span>
                <span className="font-bold">{data?.mediaSummary.delivered || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Toplam Dosya</span>
                <span className="font-bold">{data?.mediaSummary.totalFiles || 0}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-medium">Medya Geliri</span>
                <span className="text-xl font-bold text-purple-600">
                  {formatCurrency(data?.mediaSummary.revenue || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* POS Category Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Kategori Bazında Satış
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.posSummary && Object.keys(data.posSummary).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(data.posSummary)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, total]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-muted-foreground truncate">{category}</span>
                      <span className="font-bold">{formatCurrency(total)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Bugün POS satışı yok</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" /> Düşük Stok Uyarısı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white p-3 rounded-lg border border-orange-200"
                >
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-orange-600 font-bold">
                    Stok: {product.stock} / Min: {product.lowStockAlert}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print Footer */}
      <div className="hidden print:block text-center text-sm text-gray-500 mt-8 pt-4 border-t">
        <p>Bu rapor {new Date().toLocaleString('tr-TR')} tarihinde oluşturulmuştur.</p>
        <p>SkyTrack Yamaç Paraşütü Yönetim Sistemi</p>
      </div>
    </div>
  )
}
