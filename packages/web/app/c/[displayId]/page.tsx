'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Download,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Plane,
  User,
  RefreshCw,
  Image,
} from 'lucide-react'

interface CustomerData {
  displayId: string
  firstName: string
  status: string
  pilot: { id: string; name: string } | null
  flight: {
    status: string
    takeoffAt: string | null
    landingAt: string | null
  } | null
  media: {
    fileCount: number
    deliveryStatus: string
    canDownload: boolean
  } | null
}

const statusMessages: Record<string, { icon: any; title: string; description: string; color: string }> = {
  REGISTERED: {
    icon: Clock,
    title: 'Kayıt Tamamlandı',
    description: 'Pilot ataması bekleniyor...',
    color: 'text-gray-600',
  },
  ASSIGNED: {
    icon: User,
    title: 'Pilot Atandı',
    description: 'Uçuşunuz için hazırlanıyor...',
    color: 'text-blue-600',
  },
  IN_FLIGHT: {
    icon: Plane,
    title: 'Uçuşta',
    description: 'Keyifli uçuşlar!',
    color: 'text-orange-600',
  },
  COMPLETED: {
    icon: CheckCircle,
    title: 'Uçuş Tamamlandı',
    description: 'Fotoğraf ve videolarınız hazırlanıyor...',
    color: 'text-green-600',
  },
  CANCELLED: {
    icon: XCircle,
    title: 'İptal Edildi',
    description: 'Uçuşunuz iptal edilmiştir.',
    color: 'text-red-600',
  },
}

// Get API URL dynamically based on current hostname
function getApiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001/api'
  const hostname = window.location.hostname
  return `http://${hostname}:3001/api`
}

export default function CustomerDownloadPage() {
  const params = useParams()
  const displayId = params.displayId as string
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiUrl, setApiUrl] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setApiUrl(getApiUrl())
  }, [])

  const fetchData = async () => {
    if (!apiUrl) return
    try {
      const response = await fetch(`${apiUrl}/customers/public/${displayId}`)
      const result = await response.json()

      if (!result.success) {
        setError('Müşteri bulunamadı')
        return
      }

      setData(result.data)
      setError(null)
    } catch (err: any) {
      setError('Bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (apiUrl) {
      fetchData()
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [displayId, apiUrl])

  const handleDownload = () => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    setDownloading(true)

    // Create download link
    const link = document.createElement('a')
    link.href = `http://${hostname}:3001/api/media/${displayId}/download`
    link.download = `Alanya_Paragliding_${displayId}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Reset downloading state after a delay
    setTimeout(() => setDownloading(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">Sayfa Bulunamadı</h1>
            <p className="text-gray-600">{error || 'Geçersiz QR kodu'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusInfo = statusMessages[data.status] || statusMessages.REGISTERED
  const StatusIcon = statusInfo.icon
  const canDownload = data.media?.canDownload

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center pt-8 pb-4">
          <div className="inline-block bg-white rounded-full p-4 shadow-lg mb-4">
            <Plane className="w-12 h-12 text-sky-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Alanya Paragliding</h1>
          <p className="text-gray-600">Yamaç Paraşütü Deneyimi</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Müşteri Numarası</p>
              <p className="text-3xl font-mono font-bold text-sky-600 mb-2">{data.displayId}</p>
              <p className="text-lg font-medium text-gray-800">Merhaba, {data.firstName}!</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full bg-gray-100 ${statusInfo.color}`}>
                <StatusIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{statusInfo.title}</h2>
                <p className="text-gray-600">{statusInfo.description}</p>
              </div>
            </div>

            {data.pilot && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Pilotunuz</p>
                <p className="font-semibold text-lg">{data.pilot.name}</p>
              </div>
            )}

            {data.flight?.takeoffAt && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Kalkış</p>
                  <p className="font-semibold">
                    {new Date(data.flight.takeoffAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {data.flight.landingAt && (
                  <div>
                    <p className="text-sm text-gray-500">İniş</p>
                    <p className="font-semibold">
                      {new Date(data.flight.landingAt).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {data.status === 'COMPLETED' && (
          <Card className={canDownload ? 'border-green-500 border-2' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                {canDownload ? (
                  <>
                    <div className="inline-block bg-green-100 rounded-full p-4 mb-4">
                      <Camera className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-green-700 mb-2">
                      Fotoğraflarınız Hazır!
                    </h2>
                    <p className="text-gray-600 mb-4">
                      {data.media?.fileCount} dosya indirmeye hazır
                    </p>

                    <Button
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleDownload}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          İndiriliyor...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5 mr-2" />
                          Fotoğrafları İndir
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 mt-3">
                      ZIP dosyası indirilecek. Telefonunuz otomatik olarak açacaktır.
                    </p>
                  </>
                ) : data.media ? (
                  <>
                    <div className="inline-block bg-yellow-100 rounded-full p-4 mb-4">
                      <Clock className="w-10 h-10 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold text-yellow-700 mb-2">
                      Fotoğraflarınız Hazırlanıyor
                    </h2>
                    <p className="text-gray-600">
                      {data.media.fileCount} dosya yüklendi.
                      Ödeme sonrası indirilebilir olacak.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-block bg-gray-100 rounded-full p-4 mb-4">
                      <Image className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-700 mb-2">
                      Fotoğraflar Bekleniyor
                    </h2>
                    <p className="text-gray-600">
                      Fotoğraf ve videolarınız yakında yüklenecek.
                      Bu sayfa otomatik olarak güncellenecektir.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-4 pb-8">
          <p className="text-sm text-gray-500">
            Sorularınız için lütfen görevlilerimize danışın.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
          </p>
        </div>
      </div>
    </div>
  )
}
