'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import {
  ArrowLeft,
  Printer,
  Download,
  User,
  Phone,
  Mail,
  Scale,
  Plane,
  Camera,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react'

interface Customer {
  id: string
  displayId: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  emergencyContact: string | null
  weight: number | null
  qrCode: string
  waiverSigned: boolean
  waiverSignedAt: string | null
  status: string
  createdAt: string
  assignedPilot: {
    id: string
    name: string
    phone: string
  } | null
  flights: {
    id: string
    status: string
    assignedAt: string
    pickupAt: string | null
    takeoffAt: string | null
    landingAt: string | null
    durationMinutes: number | null
    pilot: { id: string; name: string }
    mediaFolder: {
      id: string
      fileCount: number
      deliveryStatus: string
    } | null
  }[]
  sales: {
    id: string
    itemName: string
    quantity: number
    totalPrice: number
    paymentStatus: string
    createdAt: string
  }[]
}

const statusLabels: Record<string, { label: string; color: string }> = {
  REGISTERED: { label: 'Kayıtlı', color: 'bg-gray-100 text-gray-700' },
  ASSIGNED: { label: 'Pilot Atandı', color: 'bg-blue-100 text-blue-700' },
  IN_FLIGHT: { label: 'Uçuşta', color: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-purple-100 text-purple-700' },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-700' },
}

const flightStatusLabels: Record<string, string> = {
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Alındı',
  IN_FLIGHT: 'Uçuşta',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [reassigning, setReassigning] = useState(false)

  const fetchCustomer = async () => {
    try {
      const response = await api.get(`/customers/${params.id}`)
      setCustomer(response.data.data)
    } catch (error) {
      console.error('Failed to fetch customer:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomer()
  }, [params.id])

  const handleReassignPilot = async () => {
    if (!customer) return
    setReassigning(true)
    try {
      await api.post(`/customers/${customer.id}/reassign-pilot`)
      await fetchCustomer()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Pilot atanamadı')
    } finally {
      setReassigning(false)
    }
  }

  const handlePrint = () => {
    if (!customer) return
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Kod - ${customer.displayId}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .qr-container { width: 5cm; margin: 0 auto; padding: 10px; border: 1px dashed #ccc; }
            .qr-code { width: 4cm; height: 4cm; }
            .display-id { font-size: 14px; font-weight: bold; margin-top: 5px; }
            .customer-name { font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${customer.qrCode}" alt="QR Code" class="qr-code" />
            <div class="display-id">${customer.displayId}</div>
            <div class="customer-name">${customer.firstName} ${customer.lastName}</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Müşteri bulunamadı</p>
        <Link href="/admin/customers">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Listeye Dön
          </Button>
        </Link>
      </div>
    )
  }

  const status = statusLabels[customer.status] || statusLabels.REGISTERED
  const latestFlight = customer.flights[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{customer.displayId}</h1>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-muted-foreground">
            {customer.firstName} {customer.lastName}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          QR Yazdır
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code */}
        <Card>
          <CardContent className="p-6 text-center">
            <img
              src={customer.qrCode}
              alt="QR Code"
              className="w-48 h-48 mx-auto"
            />
            <p className="mt-2 font-mono font-bold">{customer.displayId}</p>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Kişisel Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.weight && (
              <div className="flex items-center gap-3">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <span>{customer.weight} kg</span>
              </div>
            )}
            {customer.emergencyContact && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-red-500" />
                <span className="text-sm">Acil: {customer.emergencyContact}</span>
              </div>
            )}
            <div className="pt-2 text-sm text-muted-foreground">
              Kayıt: {new Date(customer.createdAt).toLocaleString('tr-TR')}
            </div>
            {customer.waiverSignedAt && (
              <div className="text-sm text-green-600">
                Risk formu onaylandı: {new Date(customer.waiverSignedAt).toLocaleString('tr-TR')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pilot Assignment */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Uçuş Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.assignedPilot ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{customer.assignedPilot.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.assignedPilot.phone}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReassignPilot}
                    disabled={reassigning || customer.status === 'IN_FLIGHT' || customer.status === 'COMPLETED'}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${reassigning ? 'animate-spin' : ''}`} />
                    Pilot Değiştir
                  </Button>
                </div>

                {latestFlight && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Uçuş Durumu</span>
                      <span className="text-sm">{flightStatusLabels[latestFlight.status]}</span>
                    </div>
                    {latestFlight.takeoffAt && (
                      <p className="text-sm text-muted-foreground">
                        Kalkış: {new Date(latestFlight.takeoffAt).toLocaleTimeString('tr-TR')}
                      </p>
                    )}
                    {latestFlight.landingAt && (
                      <p className="text-sm text-muted-foreground">
                        İniş: {new Date(latestFlight.landingAt).toLocaleTimeString('tr-TR')}
                        {latestFlight.durationMinutes && ` (${latestFlight.durationMinutes} dk)`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">Henüz pilot atanmadı</p>
                <Button onClick={handleReassignPilot} disabled={reassigning}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${reassigning ? 'animate-spin' : ''}`} />
                  Pilot Ata
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Medya
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestFlight?.mediaFolder ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold">{latestFlight.mediaFolder.fileCount}</p>
                <p className="text-sm text-muted-foreground">dosya yüklendi</p>
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  latestFlight.mediaFolder.deliveryStatus === 'DELIVERED'
                    ? 'bg-green-100 text-green-700'
                    : latestFlight.mediaFolder.deliveryStatus === 'PAID'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {latestFlight.mediaFolder.deliveryStatus === 'DELIVERED'
                    ? 'Teslim Edildi'
                    : latestFlight.mediaFolder.deliveryStatus === 'PAID'
                    ? 'Ödendi'
                    : 'Bekliyor'}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Henüz medya yok</p>
            )}
          </CardContent>
        </Card>

        {/* Sales */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Satışlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.sales.length > 0 ? (
              <div className="divide-y">
                {customer.sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{sale.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.quantity} adet × {new Date(sale.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₺{sale.totalPrice.toLocaleString('tr-TR')}</p>
                      <span className={`text-xs ${
                        sale.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {sale.paymentStatus === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">Henüz satış yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
