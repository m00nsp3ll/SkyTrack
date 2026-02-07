'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { ArrowLeft, UserPlus, Printer, Download } from 'lucide-react'
import Link from 'next/link'

const WAIVER_TEXT = `YAMAÇ PARAŞÜTÜ UÇUŞU RİSK VE SORUMLULUK BEYANI

Bu belgeyi imzalayarak aşağıdaki hususları kabul ve beyan ederim:

1. Yamaç paraşütü sporu, doğası gereği tehlikeli bir aktivitedir ve ciddi yaralanma veya ölüm riski taşımaktadır.

2. Uçuş sırasında hava koşulları, ekipman arızası veya diğer öngörülemeyen durumlar nedeniyle kaza meydana gelebileceğini biliyorum.

3. Herhangi bir sağlık problemim (kalp hastalığı, epilepsi, hamilelik, vb.) bulunmamaktadır veya varsa pilot ve yetkilere bildirdim.

4. Uçuş öncesi verilen tüm güvenlik talimatlarına uyacağımı taahhüt ederim.

5. Meydana gelebilecek herhangi bir kaza, yaralanma veya maddi hasar durumunda kooperatif ve pilotu sorumlu tutmayacağımı kabul ederim.

6. 18 yaşından büyük olduğumu veya yasal veli/vasi onayı aldığımı beyan ederim.`

interface RegistrationResult {
  customer: {
    id: string
    displayId: string
    firstName: string
    lastName: string
  }
  qrCode: string
  qrUrl: string
  pilotAssigned: boolean
  pilot: { id: string; name: string } | null
  message: string
}

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RegistrationResult | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    emergencyContact: '',
    weight: '',
    waiverSigned: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/customers', formData)
      setResult(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Kayıt oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && result) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Kod - ${result.customer.displayId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            .qr-container {
              width: 5cm;
              margin: 0 auto;
              padding: 10px;
              border: 1px dashed #ccc;
            }
            .qr-code { width: 4cm; height: 4cm; }
            .display-id {
              font-size: 14px;
              font-weight: bold;
              margin-top: 5px;
            }
            .customer-name {
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${result.qrCode}" alt="QR Code" class="qr-code" />
            <div class="display-id">${result.customer.displayId}</div>
            <div class="customer-name">${result.customer.firstName} ${result.customer.lastName}</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleDownloadQR = () => {
    if (result) {
      const link = document.createElement('a')
      link.href = result.qrCode
      link.download = `${result.customer.displayId}-qr.png`
      link.click()
    }
  }

  // Success state - show QR code
  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CardTitle className="text-green-700">Kayıt Başarılı!</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                <img
                  src={result.qrCode}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto"
                />
                <p className="mt-2 text-xl font-bold">{result.customer.displayId}</p>
                <p className="text-gray-600">
                  {result.customer.firstName} {result.customer.lastName}
                </p>
              </div>
            </div>

            {result.pilot && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Atanan Pilot</p>
                <p className="text-lg font-semibold text-blue-700">{result.pilot.name}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
              <Button onClick={handleDownloadQR} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                İndir
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setResult(null)
                  setFormData({
                    firstName: '',
                    lastName: '',
                    phone: '',
                    email: '',
                    emergencyContact: '',
                    weight: '',
                    waiverSigned: false,
                  })
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Yeni Kayıt
              </Button>
              <Link href={`/customers/${result.customer.id}`} className="flex-1">
                <Button variant="secondary" className="w-full">
                  Detayları Gör
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Registration form
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Yeni Müşteri Kaydı</h1>
          <p className="text-muted-foreground">Müşteri bilgilerini doldurun</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Kişisel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Adı"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Soyadı"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="05XX XXX XX XX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta (Opsiyonel)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ornek@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Acil Durumda Aranacak Kişi</Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="İsim ve telefon numarası"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Kilo (kg)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                min="20"
                max="150"
                value={formData.weight}
                onChange={handleChange}
                placeholder="Örn: 70"
              />
              <p className="text-xs text-muted-foreground">
                Uçuş güvenliği için gereklidir (20-150 kg)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk ve Sorumluluk Beyanı</CardTitle>
            <CardDescription>
              Uçuş öncesi aşağıdaki formu okuyup onaylayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto text-sm whitespace-pre-line">
              {WAIVER_TEXT}
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <input
                type="checkbox"
                id="waiverSigned"
                name="waiverSigned"
                checked={formData.waiverSigned}
                onChange={handleChange}
                className="mt-1 w-5 h-5"
                required
              />
              <label htmlFor="waiverSigned" className="text-sm">
                <span className="font-semibold">Yukarıdaki risk ve sorumluluk beyanını okudum, anladım ve kabul ediyorum.</span>
                <span className="block text-muted-foreground mt-1">
                  Tarih: {new Date().toLocaleDateString('tr-TR')} - Saat: {new Date().toLocaleTimeString('tr-TR')}
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || !formData.waiverSigned}
        >
          {loading ? 'Kaydediliyor...' : 'Kaydı Tamamla ve QR Oluştur'}
        </Button>
      </form>
    </div>
  )
}
