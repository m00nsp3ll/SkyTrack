'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  Download,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Plane,
  User,
  Wifi,
  Globe,
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
    paymentStatus: string
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
    description: 'Teşekkürler!',
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
  if (typeof window === 'undefined') return 'https://api.skytrackyp.com/api'
  const hostname = window.location.hostname

  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://api.skytrackyp.com/api'
  }
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname.replace(/^[^.]+/, 'api')}/api`
  }
  return `https://${hostname}:3001/api`
}

// Get HTTPS download URL (Cloudflare Tunnel — internet)
function getDownloadUrl(displayId: string) {
  if (typeof window === 'undefined') return ''
  const hostname = window.location.hostname

  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return `https://api.skytrackyp.com/api/media/${displayId}/download`
  }
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname.replace(/^[^.]+/, 'api')}/api/media/${displayId}/download`
  }
  return `https://${hostname}:3001/api/media/${displayId}/download`
}

export default function CustomerDownloadPage() {
  const params = useParams()
  const displayId = params.displayId as string
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiUrl, setApiUrl] = useState('')

  // Server-side LAN detection
  const [isLan, setIsLan] = useState(false)
  const [lanBaseUrl, setLanBaseUrl] = useState<string | null>(null)
  const [connectionChecked, setConnectionChecked] = useState(false)

  useEffect(() => {
    setApiUrl(getApiUrl())
  }, [])

  // Server-side LAN detection — LAN'daysa direkt indirme linkine yönlendir
  useEffect(() => {
    if (!apiUrl) return
    fetch(`${apiUrl}/network/discover`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.isLan && d.lanBaseUrl) {
          // LAN'da — direkt indirme linkine git
          window.location.href = `${d.lanBaseUrl}/api/media/${displayId}/download`
          return
        }
        // İnternette — sayfayı göster
        if (d.lanBaseUrl) setLanBaseUrl(d.lanBaseUrl)
        setConnectionChecked(true)
      })
      .catch(() => { setConnectionChecked(true) })
  }, [apiUrl, displayId])

  const fetchData = useCallback(async () => {
    if (!apiUrl) return
    try {
      const response = await fetch(`${apiUrl}/customers/public/${displayId}`)
      const result = await response.json()
      if (!result.success) { setError('Müşteri bulunamadı'); return }
      setData(result.data)
      setError(null)
    } catch (err: any) {
      setError('Bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, displayId])

  useEffect(() => {
    if (apiUrl) {
      fetchData()
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchData, apiUrl])

  // Smart download — window.location.href (top-level navigation, engellenemez)
  const handleDownload = () => {
    if (isLan && lanBaseUrl) {
      window.location.href = `${lanBaseUrl}/api/media/${displayId}/download`
    } else {
      window.location.href = getDownloadUrl(displayId)
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 via-blue-600 to-purple-600">
        <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Error state
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
                      İndirmeye Hazır!
                    </h2>
                    <p className="text-gray-600 mb-3">
                      {data.media?.fileCount} dosya indirmeye hazır
                    </p>

                    {/* Connection badge — server-side detection */}
                    {connectionChecked && (
                      <div className="mb-4">
                        {isLan ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            <Wifi className="w-3.5 h-3.5" />
                            Yerel Ağ (Hızlı İndirme)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            <Globe className="w-3.5 h-3.5" />
                            İnternet Üzerinden
                          </span>
                        )}
                      </div>
                    )}

                    {/* Single dynamic download button */}
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:from-green-600 hover:to-emerald-700 active:scale-[0.98] transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Fotoğrafları İndir
                    </button>

                    <p className="text-xs text-gray-500 mt-3">
                      ZIP dosyası indirilecek. Telefonunuz otomatik olarak açacaktır.
                    </p>
                  </>
                ) : data.media && data.media.fileCount > 0 ? (
                  <>
                    <div className="inline-block bg-orange-100 rounded-full p-4 mb-4">
                      <Clock className="w-10 h-10 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-bold text-orange-700 mb-2">
                      Hazırlandı - Ödeme Bekliyor
                    </h2>
                    <p className="text-gray-600">
                      {data.media.fileCount} dosya hazır.
                      <br />
                      Ödeme sonrası indirilebilir olacak.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-block bg-blue-100 rounded-full p-4 mb-4">
                      <Camera className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-blue-700 mb-2">
                      Fotoğraflar Hazırlanıyor
                    </h2>
                    <p className="text-gray-600">
                      Fotoğraf ve videolarınız yakında yüklenecek.
                      <br />
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
