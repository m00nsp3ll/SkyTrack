'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plane, User, Camera, Download, Clock, CheckCircle, AlertCircle, Image, Video, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface MediaFile {
  filename: string
  url: string
  thumbnailUrl?: string
  size: number
  type: 'photo' | 'video'
}

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

interface FilesData {
  files: MediaFile[]
  totalSize: number
  paymentStatus: string
  deliveryStatus: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function CustomerLandingPage() {
  const params = useParams()
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showGallery, setShowGallery] = useState(false)
  const [filesData, setFilesData] = useState<FilesData | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/customers/public/${params.displayId}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error?.message || 'Müşteri bulunamadı')
      }
    } catch (err) {
      setError('Bağlantı hatası. Lütfen WiFi bağlantınızı kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  const fetchFiles = async () => {
    if (!data?.media?.canDownload) return

    setLoadingFiles(true)
    try {
      const response = await fetch(`${API_URL}/media/${params.displayId}/files`)
      const result = await response.json()

      if (result.success) {
        setFilesData(result.data)
        setShowGallery(true)
      }
    } catch (err) {
      console.error('Failed to fetch files:', err)
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [params.displayId])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleDownloadAll = () => {
    window.open(`${API_URL}/media/${params.displayId}/download`, '_blank')
  }

  const handleDownloadFile = (filename: string) => {
    window.open(`${API_URL}/media/${params.displayId}/download/${filename}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Hata</h1>
            <p className="text-gray-600">{error || 'Müşteri bulunamadı'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusInfo = () => {
    switch (data.status) {
      case 'REGISTERED':
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'Pilot Bekleniyor',
          description: 'Kısa süre içinde bir pilot atanacak.',
        }
      case 'ASSIGNED':
        return {
          icon: User,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          label: 'Pilot Atandı',
          description: 'Pilotunuz sizinle buluşacak.',
        }
      case 'IN_FLIGHT':
        return {
          icon: Plane,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          label: 'Uçuştasınız!',
          description: 'Keyifli uçuşlar!',
        }
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          color: 'text-purple-500',
          bgColor: 'bg-purple-100',
          label: 'Uçuş Tamamlandı',
          description: 'Umarız keyifli bir deneyim yaşadınız!',
        }
      default:
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'Bekliyor',
          description: '',
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  // Gallery Modal
  if (showGallery && filesData) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowGallery(false)}
              className="flex items-center gap-2 text-white"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Geri</span>
            </button>
            <h1 className="text-white font-medium">
              {filesData.files.length} Dosya
            </h1>
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Download className="w-4 h-4" />
              Tümü
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="p-2">
          <div className="grid grid-cols-3 gap-1">
            {filesData.files.map((file, index) => (
              <div
                key={file.filename}
                className="aspect-square relative cursor-pointer"
                onClick={() => setSelectedIndex(index)}
              >
                {file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    {file.type === 'video' ? (
                      <Video className="w-8 h-8 text-gray-600" />
                    ) : (
                      <Image className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                )}

                {/* Video indicator */}
                {file.type === 'video' && (
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white px-1.5 py-0.5 rounded text-xs">
                    Video
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Full-screen viewer */}
        {selectedIndex !== null && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Viewer Header */}
            <div className="flex items-center justify-between p-4 bg-black/80">
              <button
                onClick={() => setSelectedIndex(null)}
                className="text-white p-2"
              >
                <X className="w-6 h-6" />
              </button>
              <span className="text-white">
                {selectedIndex + 1} / {filesData.files.length}
              </span>
              <button
                onClick={() => handleDownloadFile(filesData.files[selectedIndex].filename)}
                className="text-white p-2"
              >
                <Download className="w-6 h-6" />
              </button>
            </div>

            {/* Image/Video */}
            <div className="flex-1 flex items-center justify-center p-4">
              {filesData.files[selectedIndex].type === 'video' ? (
                <video
                  src={filesData.files[selectedIndex].url}
                  controls
                  className="max-w-full max-h-full"
                  autoPlay
                />
              ) : (
                <img
                  src={filesData.files[selectedIndex].url}
                  alt={filesData.files[selectedIndex].filename}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                disabled={selectedIndex === 0}
                className="text-white p-3 disabled:opacity-30"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <div className="text-white text-sm">
                {filesData.files[selectedIndex].filename}
                <br />
                <span className="text-gray-400">
                  {formatBytes(filesData.files[selectedIndex].size)}
                </span>
              </div>
              <button
                onClick={() => setSelectedIndex(Math.min(filesData.files.length - 1, selectedIndex + 1))}
                disabled={selectedIndex === filesData.files.length - 1}
                className="text-white p-3 disabled:opacity-30"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 text-center">
        <h1 className="text-2xl font-bold">SkyTrack</h1>
        <p className="text-blue-100">Alanya Yamaç Paraşütü</p>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4 -mt-4">
        {/* Welcome Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 text-sm mb-1">Hoş Geldiniz</p>
            <h2 className="text-2xl font-bold text-gray-900">{data.firstName}</h2>
            <p className="text-sm text-gray-500 font-mono mt-1">{data.displayId}</p>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${statusInfo.bgColor}`}>
                <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{statusInfo.label}</h3>
                <p className="text-gray-600 text-sm">{statusInfo.description}</p>
              </div>
            </div>

            {data.flight?.takeoffAt && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Kalkış: {new Date(data.flight.takeoffAt).toLocaleTimeString('tr-TR')}
                </p>
                {data.flight.landingAt && (
                  <p className="text-sm text-gray-500">
                    İniş: {new Date(data.flight.landingAt).toLocaleTimeString('tr-TR')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pilot Card */}
        {data.pilot && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pilotunuz</p>
                  <h3 className="text-lg font-bold text-gray-900">{data.pilot.name}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Media Card */}
        {data.media && data.media.fileCount > 0 && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Camera className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fotoğraf & Video</p>
                  <h3 className="text-lg font-bold text-gray-900">
                    {data.media.fileCount} dosya hazır
                  </h3>
                </div>
              </div>

              {data.media.canDownload ? (
                <div className="space-y-3">
                  <button
                    onClick={fetchFiles}
                    disabled={loadingFiles}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {loadingFiles ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Image className="w-5 h-5" />
                        Galeriye Git
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadAll}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Tümünü İndir (ZIP)
                  </button>
                </div>
              ) : (
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-yellow-800 font-medium">Ödeme Bekleniyor</p>
                  <p className="text-yellow-600 text-sm mt-1">
                    Dosyalarınızı indirmek için lütfen ödeme yapın.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm py-4">
          <p>SkyTrack Yamaç Paraşütü Yönetim Sistemi</p>
        </div>
      </div>
    </div>
  )
}
