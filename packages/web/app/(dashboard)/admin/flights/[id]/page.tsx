'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { flightsApi, pilotsApi } from '@/lib/api'
import {
  ArrowLeft,
  Plane,
  User,
  Phone,
  Scale,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
  Folder,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react'

interface TimelineItem {
  event: string
  time: string
  status: string
}

interface Flight {
  id: string
  status: string
  createdAt: string
  pickupAt?: string
  takeoffAt?: string
  landingAt?: string
  durationMinutes?: number
  notes?: string
  customer: {
    id: string
    displayId: string
    firstName: string
    lastName: string
    phone: string
    email?: string
    weight: number
  }
  pilot: {
    id: string
    name: string
    phone: string
  }
  mediaFolder?: {
    id: string
    folderPath: string
    fileCount: number
    totalSizeBytes: number
  }
  timeline: TimelineItem[]
  sales: any[]
}

interface Pilot {
  id: string
  name: string
  dailyFlightCount: number
  maxDailyFlights: number
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: 'Atandı', color: 'bg-gray-500' },
  PICKED_UP: { label: 'Alındı', color: 'bg-yellow-500' },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-blue-500' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-green-500' },
  CANCELLED: { label: 'İptal', color: 'bg-red-500' },
}

export default function FlightDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [flight, setFlight] = useState<Flight | null>(null)
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [selectedPilot, setSelectedPilot] = useState('')
  const [showReassign, setShowReassign] = useState(false)

  const fetchFlight = async () => {
    try {
      const response = await flightsApi.getById(id as string)
      setFlight(response.data.data)
    } catch (error) {
      console.error('Failed to fetch flight:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPilots = async () => {
    try {
      const response = await pilotsApi.getAll()
      setPilots(response.data.data.filter((p: any) => p.isActive))
    } catch (error) {
      console.error('Failed to fetch pilots:', error)
    }
  }

  useEffect(() => {
    fetchFlight()
    fetchPilots()
  }, [id])

  const handleCancel = async () => {
    if (!confirm('Bu uçuşu iptal etmek istediğinizden emin misiniz?')) return

    setCancelling(true)
    try {
      await flightsApi.cancel(id as string)
      fetchFlight()
    } catch (error: any) {
      alert(error.response?.data?.message || 'İptal başarısız')
    } finally {
      setCancelling(false)
    }
  }

  const handleReassign = async () => {
    if (!selectedPilot) return

    setReassigning(true)
    try {
      await flightsApi.reassign(id as string, selectedPilot)
      setShowReassign(false)
      fetchFlight()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Pilot değiştirme başarısız')
    } finally {
      setReassigning(false)
    }
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!flight) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Uçuş bulunamadı</p>
        <Link href="/admin/flights">
          <Button className="mt-4">Uçuşlara Dön</Button>
        </Link>
      </div>
    )
  }

  const status = statusLabels[flight.status]
  const canCancel = !['COMPLETED', 'CANCELLED'].includes(flight.status)
  const canReassign = ['ASSIGNED', 'PICKED_UP'].includes(flight.status)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/flights">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{flight.customer.displayId}</h1>
            <span className={`inline-block px-3 py-1 rounded-full text-white text-sm ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {canReassign && (
            <Button variant="outline" onClick={() => setShowReassign(!showReassign)}>
              <User className="h-4 w-4 mr-1" />
              Pilot Değiştir
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
              İptal Et
            </Button>
          )}
        </div>
      </div>

      {/* Reassign Panel */}
      {showReassign && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Pilot Değiştir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <select
                value={selectedPilot}
                onChange={(e) => setSelectedPilot(e.target.value)}
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilot seçin...</option>
                {pilots
                  .filter((p) => p.id !== flight.pilot.id && p.dailyFlightCount < p.maxDailyFlights)
                  .map((pilot) => (
                    <option key={pilot.id} value={pilot.id}>
                      {pilot.name} ({pilot.dailyFlightCount}/{pilot.maxDailyFlights})
                    </option>
                  ))}
              </select>
              <Button onClick={handleReassign} disabled={!selectedPilot || reassigning}>
                {reassigning ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Onayla'}
              </Button>
              <Button variant="outline" onClick={() => setShowReassign(false)}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Uçuş Zaman Çizelgesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {flight.timeline.map((item, index) => (
                <div key={index} className="relative pl-10">
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                      item.status === 'cancelled' ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  >
                    {item.status === 'cancelled' ? (
                      <XCircle className="h-3 w-3 text-white" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{item.event}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {flight.durationMinutes && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-center text-lg">
                Uçuş Süresi: <span className="font-bold text-primary">{flight.durationMinutes} dakika</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Müşteri Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Ad Soyad</p>
              <p className="font-medium">{flight.customer.firstName} {flight.customer.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefon</p>
              <a href={`tel:${flight.customer.phone}`} className="font-medium text-primary flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {flight.customer.phone}
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kilo</p>
              <p className="font-medium flex items-center gap-1">
                <Scale className="h-4 w-4" />
                {flight.customer.weight} kg
              </p>
            </div>
            <Link href={`/admin/customers/${flight.customer.id}`}>
              <Button variant="outline" className="w-full mt-2">
                Müşteri Detayı
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pilot Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Pilot Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Pilot</p>
              <p className="font-medium">{flight.pilot.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefon</p>
              <a href={`tel:${flight.pilot.phone}`} className="font-medium text-primary flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {flight.pilot.phone}
              </a>
            </div>
            <Link href={`/admin/pilots/${flight.pilot.id}`}>
              <Button variant="outline" className="w-full mt-2">
                Pilot Detayı
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Media Folder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Medya Klasörü
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flight.mediaFolder ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{flight.mediaFolder.fileCount} dosya</p>
                <p className="text-sm text-muted-foreground">
                  {(flight.mediaFolder.totalSizeBytes / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="outline">Dosyaları Görüntüle</Button>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {flight.status === 'COMPLETED' ? (
                <p>Medya klasörü oluşturuldu, henüz dosya yüklenmedi</p>
              ) : (
                <p>Uçuş tamamlandığında medya klasörü oluşturulacak</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Bu Uçuşa Ait Satışlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flight.sales && flight.sales.length > 0 ? (
            <div className="space-y-2">
              {flight.sales.map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{sale.items?.length || 0} ürün</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleTimeString('tr-TR')}
                    </p>
                  </div>
                  <p className="font-bold">{sale.totalAmount} TL</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">Bu uçuşa ait satış bulunmuyor</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {flight.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Notlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{flight.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
