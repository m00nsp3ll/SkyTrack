'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HardDrive,
  Database,
  Cpu,
  RefreshCw,
  Server,
  Clock,
  Users,
  Plane,
  ShoppingCart,
  Camera,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { reportsApi } from '@/lib/api'

interface SystemData {
  disk: {
    mediaSize: number
    mediaSizeFormatted: string
  }
  database: {
    size: number
    sizeFormatted: string
    records: {
      customers: number
      flights: number
      sales: number
      mediaFolders: number
    }
  }
  system: {
    uptime: string
    memory: {
      total: string
      used: string
      free: string
      usagePercent: string
    }
    platform: string
    nodeVersion: string
  }
  timestamp: string
}

export default function SystemMonitorPage() {
  const [data, setData] = useState<SystemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await reportsApi.getSystem()
      setData(res.data.data)
    } catch (err: any) {
      console.error('Sistem bilgisi hatası:', err)
      if (err.response?.status === 403) {
        setError('Bu sayfaya erişim yetkiniz yok. Admin yetkisi gereklidir.')
      } else {
        setError('Sistem bilgileri alınamadı.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Refresh every minute
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-red-600">{error}</p>
        <Button onClick={fetchData} variant="outline">
          Tekrar Dene
        </Button>
      </div>
    )
  }

  const memoryUsage = parseFloat(data?.system.memory.usagePercent || '0')
  const memoryStatus =
    memoryUsage > 90 ? 'critical' : memoryUsage > 70 ? 'warning' : 'healthy'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistem İzleme</h1>
          <p className="text-muted-foreground">
            Son güncelleme:{' '}
            {data?.timestamp && new Date(data.timestamp).toLocaleString('tr-TR')}
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform
            </CardTitle>
            <Server className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold capitalize">{data?.system.platform || '-'}</p>
            <p className="text-xs text-muted-foreground">
              Node {data?.system.nodeVersion || '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uptime
            </CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{data?.system.uptime || '-'}</p>
            <Badge variant="secondary" className="bg-green-100 text-green-800 mt-1">
              <CheckCircle className="h-3 w-3 mr-1" />
              Çalışıyor
            </Badge>
          </CardContent>
        </Card>

        <Card
          className={
            memoryStatus === 'critical'
              ? 'border-red-200 bg-red-50'
              : memoryStatus === 'warning'
              ? 'border-yellow-200 bg-yellow-50'
              : ''
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bellek Kullanımı
            </CardTitle>
            <Cpu
              className={`h-4 w-4 ${
                memoryStatus === 'critical'
                  ? 'text-red-600'
                  : memoryStatus === 'warning'
                  ? 'text-yellow-600'
                  : 'text-purple-600'
              }`}
            />
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-bold ${
                memoryStatus === 'critical'
                  ? 'text-red-600'
                  : memoryStatus === 'warning'
                  ? 'text-yellow-600'
                  : ''
              }`}
            >
              %{data?.system.memory.usagePercent || '0'}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  memoryStatus === 'critical'
                    ? 'bg-red-600'
                    : memoryStatus === 'warning'
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
                style={{ width: `${memoryUsage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Veritabanı
            </CardTitle>
            <Database className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{data?.database.sizeFormatted || '-'}</p>
            <p className="text-xs text-muted-foreground">PostgreSQL</p>
          </CardContent>
        </Card>
      </div>

      {/* Memory Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="h-5 w-5" /> Bellek Detayları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Toplam</p>
              <p className="text-2xl font-bold">{data?.system.memory.total || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Kullanılan</p>
              <p className="text-2xl font-bold text-orange-600">
                {data?.system.memory.used || '-'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Boş</p>
              <p className="text-2xl font-bold text-green-600">
                {data?.system.memory.free || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HardDrive className="h-5 w-5" /> Depolama
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Camera className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Medya Dosyaları</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {data?.disk.mediaSizeFormatted || '0 B'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Veritabanı</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {data?.database.sizeFormatted || '0 B'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" /> Veritabanı Kayıtları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground">Müşteriler</p>
              <p className="text-2xl font-bold">
                {data?.database.records.customers.toLocaleString('tr-TR') || 0}
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Plane className="h-6 w-6 mx-auto text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground">Uçuşlar</p>
              <p className="text-2xl font-bold">
                {data?.database.records.flights.toLocaleString('tr-TR') || 0}
              </p>
            </div>

            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <ShoppingCart className="h-6 w-6 mx-auto text-teal-600 mb-2" />
              <p className="text-sm text-muted-foreground">Satışlar</p>
              <p className="text-2xl font-bold">
                {data?.database.records.sales.toLocaleString('tr-TR') || 0}
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Camera className="h-6 w-6 mx-auto text-purple-600 mb-2" />
              <p className="text-sm text-muted-foreground">Medya Klasörleri</p>
              <p className="text-2xl font-bold">
                {data?.database.records.mediaFolders.toLocaleString('tr-TR') || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Normal (&lt;70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Uyarı (70-90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Kritik (&gt;90%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
