'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { pilotsApi } from '@/lib/api'
import {
  ArrowLeft,
  Save,
  Loader2,
  Phone,
  Mail,
  Plane,
  Calendar,
  CheckCircle,
  Coffee,
  Moon,
  Trash2,
  User,
  Users,
  TrendingUp,
  Filter,
} from 'lucide-react'

interface Flight {
  id: string
  status: string
  createdAt: string
  customer: {
    id: string
    displayId: string
    firstName: string
    lastName: string
    weight: number
  }
}

interface Pilot {
  id: string
  name: string
  phone: string
  email?: string
  status: 'AVAILABLE' | 'IN_FLIGHT' | 'ON_BREAK' | 'OFF_DUTY'
  dailyFlightCount: number
  maxDailyFlights: number
  queuePosition: number
  isActive: boolean
  createdAt: string
  totalFlights: number
  completedAllTime: number
  todayFlights: Flight[]
  filteredFlights: Flight[]
  todayStats: {
    total: number
    completed: number
    inProgress: number
    cancelled: number
  }
  filteredStats: {
    total: number
    completed: number
    inProgress: number
    cancelled: number
  }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  AVAILABLE: { label: 'Müsait', color: 'bg-green-500', icon: CheckCircle },
  ASSIGNED: { label: 'Müşteri Atandı', color: 'bg-orange-500', icon: Users },
  PICKED_UP: { label: 'Müşteri Alındı', color: 'bg-purple-500', icon: Users },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-blue-500', icon: Plane },
  ON_BREAK: { label: 'Molada', color: 'bg-yellow-500', icon: Coffee },
  OFF_DUTY: { label: 'Mesai Dışı', color: 'bg-gray-500', icon: Moon },
}

const flightStatusLabels: Record<string, string> = {
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Alındı',
  IN_FLIGHT: 'Uçuşta',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
}

export default function PilotDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [pilot, setPilot] = useState<Pilot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    maxDailyFlights: 7,
    isActive: true,
  })

  // Date filter state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFiltered, setShowFiltered] = useState(false)

  const fetchPilot = async (from?: string, to?: string) => {
    try {
      setLoading(true)
      const params: any = {}
      if (from) params.from = from
      if (to) params.to = to

      const response = await pilotsApi.getById(id as string + (from || to ? `?from=${from || ''}&to=${to || ''}` : ''))
      const data = response.data.data
      setPilot(data)
      setFormData({
        name: data.name,
        phone: data.phone,
        email: data.email || '',
        maxDailyFlights: data.maxDailyFlights,
        isActive: data.isActive,
      })
    } catch (err) {
      console.error('Failed to fetch pilot:', err)
      setError('Pilot bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPilot()
  }, [id])

  const handleFilter = () => {
    if (dateFrom) {
      setShowFiltered(true)
      fetchPilot(dateFrom, dateTo || dateFrom)
    }
  }

  const handleClearFilter = () => {
    setDateFrom('')
    setDateTo('')
    setShowFiltered(false)
    fetchPilot()
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      await pilotsApi.update(id as string, formData)
      setIsEditing(false)
      fetchPilot()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kaydetme başarısız')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    try {
      await pilotsApi.updateStatus(id as string, status)
      fetchPilot()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Durum değiştirilemedi')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bu pilotu silmek istediğinizden emin misiniz?')) return

    try {
      await pilotsApi.delete(id as string)
      router.push('/admin/pilots')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Silme başarısız')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!pilot) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pilot bulunamadı</p>
        <Link href="/admin/pilots">
          <Button className="mt-4">Pilot Listesine Dön</Button>
        </Link>
      </div>
    )
  }

  const status = statusConfig[pilot.status] || { label: pilot.status, color: 'bg-gray-500', icon: User }
  const StatusIcon = status.icon
  const displayFlights = showFiltered ? pilot.filteredFlights : pilot.todayFlights
  const displayStats = showFiltered ? pilot.filteredStats : pilot.todayStats

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/pilots">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{pilot.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${status.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
              {!pilot.isActive && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600">
                  Pasif
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>Düzenle</Button>
          ) : (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Kaydet
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                İptal
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid - Today + All Time */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {pilot.dailyFlightCount}/{pilot.maxDailyFlights}
            </p>
            <p className="text-sm text-muted-foreground">Bugün</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {pilot.todayStats?.completed || 0}
            </p>
            <p className="text-sm text-muted-foreground">Bugün Tamamlanan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {pilot.todayStats?.inProgress || 0}
            </p>
            <p className="text-sm text-muted-foreground">Devam Eden</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {pilot.totalFlights || 0}
            </p>
            <p className="text-sm text-muted-foreground">Toplam Uçuş</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">
              {pilot.completedAllTime || 0}
            </p>
            <p className="text-sm text-muted-foreground">Toplam Tamamlanan</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter - Moved to top */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Tarih Filtresi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Başlangıç</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bitiş (opsiyonel)</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={handleFilter} disabled={!dateFrom}>
              Filtrele
            </Button>
            {showFiltered && (
              <Button variant="outline" onClick={handleClearFilter}>
                Temizle
              </Button>
            )}
          </div>
          {showFiltered && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Filtre:</strong> {dateFrom} {dateTo && `- ${dateTo}`} |
                <strong> Toplam:</strong> {displayStats.total} |
                <strong> Tamamlanan:</strong> {displayStats.completed} |
                <strong> İptal:</strong> {displayStats.cancelled}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Status Change */}
      {pilot.isActive && pilot.status !== 'IN_FLIGHT' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hızlı Durum Değiştir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {['AVAILABLE', 'ON_BREAK', 'OFF_DUTY'].map((s) => {
                const cfg = statusConfig[s as keyof typeof statusConfig]
                const Icon = cfg.icon
                return (
                  <Button
                    key={s}
                    variant={pilot.status === s ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(s)}
                    disabled={pilot.status === s}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {cfg.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pilot Info */}
      <Card>
        <CardHeader>
          <CardTitle>Pilot Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Günlük Maks. Uçuş</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.maxDailyFlights}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDailyFlights: parseInt(e.target.value) || 7,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive">Aktif</Label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{pilot.phone}</span>
              </div>
              {pilot.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{pilot.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span>Günlük limit: {pilot.maxDailyFlights} uçuş</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Kayıt: {new Date(pilot.createdAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flights List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{showFiltered ? 'Filtrelenmiş Uçuşlar' : 'Bugünkü Uçuşlar'}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {displayFlights?.length || 0} uçuş
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayFlights?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {showFiltered ? 'Bu tarih aralığında uçuş yok' : 'Bugün henüz uçuş yok'}
            </p>
          ) : (
            <div className="space-y-3">
              {displayFlights?.map((flight) => (
                <Link
                  key={flight.id}
                  href={`/admin/customers/${flight.customer.displayId}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {flight.customer.firstName} {flight.customer.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {flight.customer.displayId} · {flight.customer.weight} kg · {new Date(flight.createdAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      flight.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : flight.status === 'IN_FLIGHT'
                        ? 'bg-blue-100 text-blue-700'
                        : flight.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {flightStatusLabels[flight.status] || flight.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Button */}
      <Card className="border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-600">Tehlikeli Alan</p>
              <p className="text-sm text-muted-foreground">
                Pilotu sistemden kaldır
              </p>
            </div>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Pilotu Sil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
