'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import {
  Server,
  CheckCircle,
  XCircle,
  RefreshCw,
  HardDrive,
  Wifi,
} from 'lucide-react'

interface NasStatus {
  connected: boolean
  message: string
}

interface DiskUsage {
  total: string
  used: string
  available: string
  percent: string
}

export default function NasPage() {
  const [status, setStatus] = useState<NasStatus | null>(null)
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingDisk, setLoadingDisk] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const testConnection = async () => {
    setLoadingStatus(true)
    try {
      const res = await api.get('/nas/status')
      setStatus(res.data.data)
      setLastChecked(new Date().toLocaleTimeString('tr-TR'))
    } catch (err) {
      setStatus({ connected: false, message: 'API isteği başarısız' })
    } finally {
      setLoadingStatus(false)
    }
  }

  const fetchDiskUsage = async () => {
    setLoadingDisk(true)
    try {
      const res = await api.get('/nas/disk-usage')
      setDiskUsage(res.data.data)
    } catch (err) {
      setDiskUsage(null)
    } finally {
      setLoadingDisk(false)
    }
  }

  const handleRefreshAll = async () => {
    await Promise.all([testConnection(), fetchDiskUsage()])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6" />
            NAS Yönetimi
          </h1>
          <p className="text-muted-foreground">
            QNAP TS-873A — {process.env.NEXT_PUBLIC_QNAP_HOST || '192.168.1.111'}
          </p>
        </div>
        <Button onClick={handleRefreshAll} disabled={loadingStatus || loadingDisk}>
          <RefreshCw className={`h-4 w-4 mr-2 ${(loadingStatus || loadingDisk) ? 'animate-spin' : ''}`} />
          Tümünü Yenile
        </Button>
      </div>

      {/* Bağlantı Durumu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Bağlantı Durumu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status ? (
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              status.connected
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {status.connected ? (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className={`font-semibold ${status.connected ? 'text-green-700' : 'text-red-700'}`}>
                  {status.connected ? 'Bağlantı Başarılı' : 'Bağlantı Hatası'}
                </p>
                <p className="text-sm text-muted-foreground">{status.message}</p>
                {lastChecked && (
                  <p className="text-xs text-muted-foreground mt-1">Son kontrol: {lastChecked}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Henüz test edilmedi</p>
          )}
          <Button onClick={testConnection} disabled={loadingStatus} variant="outline">
            {loadingStatus ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4 mr-2" />
            )}
            Bağlantıyı Test Et
          </Button>
        </CardContent>
      </Card>

      {/* Disk Kullanımı */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Disk Kullanımı
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {diskUsage ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{diskUsage.total}</p>
                  <p className="text-xs text-muted-foreground">Toplam</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{diskUsage.used}</p>
                  <p className="text-xs text-blue-600">Kullanılan</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{diskUsage.available}</p>
                  <p className="text-xs text-green-600">Boş</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Doluluk Oranı</span>
                  <span className="font-semibold">{diskUsage.percent}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      parseInt(diskUsage.percent) > 80 ? 'bg-red-500' :
                      parseInt(diskUsage.percent) > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: diskUsage.percent }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Henüz yüklenmedi</p>
          )}
          <Button onClick={fetchDiskUsage} disabled={loadingDisk} variant="outline">
            {loadingDisk ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <HardDrive className="h-4 w-4 mr-2" />
            )}
            Disk Bilgisini Yenile
          </Button>
        </CardContent>
      </Card>

      {/* NAS Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle>NAS Yapılandırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium">QNAP TS-873A</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Lokal IP</span>
              <span className="font-mono">192.168.1.111</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Medya Yolu</span>
              <span className="font-mono">/share/skytrack-media</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Bağlantı</span>
              <span className="font-medium">SSH (port 22)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Klasör Yapısı</span>
              <span className="font-mono text-xs">YYYY-MM-DD / PilotAdi / MusteriKodu</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
