'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { ArrowLeft, UserPlus, Printer, Download, FileText, Eraser, Check, X, PenLine } from 'lucide-react'
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    emergencyContact: '',
    weight: '',
  })

  // Handle canvas resize for fullscreen modal
  useEffect(() => {
    if (showWaiverModal && signatureRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const canvas = signatureRef.current?.getCanvas()
        if (canvas) {
          const parent = canvas.parentElement
          if (parent) {
            const rect = parent.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height
            // Clear and set background after resize
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.fillStyle = 'white'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
            }
          }
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [showWaiverModal])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
  }

  const handleSignatureConfirm = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const data = signatureRef.current.toDataURL('image/png')
      setSignatureData(data)
      setShowWaiverModal(false)
    }
  }

  const handleSignatureCancel = () => {
    setShowWaiverModal(false)
    signatureRef.current?.clear()
  }

  const openWaiverModal = () => {
    // Validate form before opening modal
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError('Lütfen önce Ad, Soyad ve Telefon bilgilerini doldurun')
      return
    }
    setError('')
    setShowWaiverModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!signatureData) {
      setError('Lütfen risk formunu imzalayın')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/customers', {
        ...formData,
        waiverSigned: true,
        signatureData,
      })
      setResult(response.data.data)
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.response?.data?.error?.message || 'Kayıt oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && result) {
      const now = new Date()
      const dateStr = now.toLocaleDateString('tr-TR')
      const timeStr = now.toLocaleTimeString('tr-TR')
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Kod - ${result.customer.displayId}</title>
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            @media print {
              html, body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 10px;
              margin: 0;
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
            .datetime {
              font-size: 10px;
              color: #888;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${result.qrCode}" alt="QR Code" class="qr-code" />
            <div class="display-id">${result.customer.displayId}</div>
            <div class="customer-name">${result.customer.firstName} ${result.customer.lastName}</div>
            <div class="datetime">${dateStr} - ${timeStr}</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handlePrintWaiver = () => {
    if (result && signatureData) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const now = new Date()
        const dateStr = now.toLocaleDateString('tr-TR')
        const timeStr = now.toLocaleTimeString('tr-TR')

        const waiverText = `YAMAC PARASUTU UCUSU RISK VE SORUMLULUK BEYANI

Bu belgeyi imzalayarak asagidaki hususlari kabul ve beyan ederim:

1. Yamac parasutu sporu, dogasi geregi tehlikeli bir aktivitedir ve ciddi yaralanma veya olum riski tasimaktadir.

2. Ucus sirasinda hava kosullari, ekipman arizasi veya diger ongorulemeyen durumlar nedeniyle kaza meydana gelebilecegini biliyorum.

3. Herhangi bir saglik problemim (kalp hastaligi, epilepsi, hamilelik, vb.) bulunmamaktadir veya varsa pilot ve yetkilere bildirdim.

4. Ucus oncesi verilen tum guvenlik talimatlarina uyacagimi taahhut ederim.

5. Meydana gelebilecek herhangi bir kaza, yaralanma veya maddi hasar durumunda kooperatif ve pilotu sorumlu tutmayacagimi kabul ederim.

6. 18 yasindan buyuk oldugumu veya yasal veli/vasi onayi aldigimi beyan ederim.`

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Risk Formu - ${result.customer.displayId}</title>
            <style>
              @page {
                size: A4;
                margin: 15mm;
              }
              @media print {
                html, body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                margin: 0;
                font-size: 12px;
                line-height: 1.5;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .header h1 {
                font-size: 18px;
                margin: 0 0 5px 0;
              }
              .header h2 {
                font-size: 14px;
                margin: 0;
                font-weight: normal;
              }
              .info-box {
                border: 1px solid #ccc;
                padding: 10px;
                margin-bottom: 15px;
                background: #f9f9f9;
              }
              .info-box p {
                margin: 3px 0;
              }
              .waiver-text {
                white-space: pre-line;
                text-align: justify;
                margin-bottom: 20px;
              }
              .signature-section {
                margin-top: 30px;
              }
              .signature-section h3 {
                font-size: 12px;
                margin-bottom: 10px;
                text-decoration: underline;
              }
              .signature-name {
                font-weight: bold;
                margin-bottom: 5px;
              }
              .signature-img {
                max-width: 200px;
                max-height: 80px;
                border-bottom: 1px solid #000;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>ALANYA PARAGLIDING</h1>
              <h2>RISK VE SORUMLULUK BEYANI</h2>
            </div>

            <div class="info-box">
              <p><strong>Musteri No:</strong> ${result.customer.displayId}</p>
              <p><strong>Ad Soyad:</strong> ${result.customer.firstName} ${result.customer.lastName}</p>
              <p><strong>Tarih:</strong> ${dateStr}</p>
              <p><strong>Saat:</strong> ${timeStr}</p>
            </div>

            <div class="waiver-text">${waiverText}</div>

            <div class="signature-section">
              <h3>IMZA</h3>
              <p>Yukaridaki beyani okudum, anladim ve kabul ediyorum.</p>
              <p class="signature-name">${result.customer.firstName} ${result.customer.lastName}</p>
              <img src="${signatureData}" alt="Imza" class="signature-img" />
            </div>

            <script>window.onload = () => window.print();</script>
          </body>
          </html>
        `)
        printWindow.document.close()
      }
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

  const resetForm = () => {
    setResult(null)
    setSignatureData(null)
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      emergencyContact: '',
      weight: '',
    })
  }

  // Fullscreen Waiver Modal
  if (showWaiverModal) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-blue-600 text-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Risk ve Sorumluluk Beyanı</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignatureCancel}
            className="text-white hover:bg-blue-700"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Customer Info */}
        <div className="flex-shrink-0 bg-blue-50 px-4 py-2 text-sm">
          <span className="font-semibold">{formData.firstName} {formData.lastName}</span>
          <span className="mx-2">|</span>
          <span>{formData.phone}</span>
          <span className="mx-2">|</span>
          <span>{new Date().toLocaleDateString('tr-TR')}</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Waiver Text */}
          <div className="p-4 bg-gray-50 text-sm whitespace-pre-line border-b">
            {WAIVER_TEXT}
          </div>

          {/* Signature Area */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-lg font-semibold">Aşağıya imzanızı atın:</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
              >
                <Eraser className="w-4 h-4 mr-1" />
                Temizle
              </Button>
            </div>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden"
              style={{ height: '200px' }}
            >
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: 'touch-none',
                  style: {
                    width: '100%',
                    height: '100%',
                    touchAction: 'none',
                    display: 'block'
                  }
                }}
                backgroundColor="white"
                penColor="black"
                minWidth={1}
                maxWidth={2.5}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Parmağınız veya mouse ile yukarıdaki alana imzanızı atın
            </p>
          </div>
        </div>

        {/* Footer Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 bg-gray-100 border-t flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 text-base"
            onClick={handleSignatureCancel}
          >
            <X className="w-5 h-5 mr-2" />
            İptal
          </Button>
          <Button
            className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700"
            onClick={handleSignatureConfirm}
          >
            <Check className="w-5 h-5 mr-2" />
            İmzayı Onayla
          </Button>
        </div>
      </div>
    )
  }

  // Success state - show QR code
  if (result) {
    const now = new Date()
    const dateStr = now.toLocaleDateString('tr-TR')
    const timeStr = now.toLocaleTimeString('tr-TR')

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
                <p className="text-sm text-gray-500 mt-1">
                  {dateStr} - {timeStr}
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
                QR Yazdır
              </Button>
              <Button onClick={handleDownloadQR} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                QR İndir
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handlePrintWaiver}
              >
                <Printer className="w-4 h-4 mr-2" />
                Risk Formu Yazdır
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`${API_URL}/customers/${result.customer.id}/waiver-pdf`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF İndir
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetForm}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Yeni Kayıt
              </Button>
              <Link href={`/admin/customers/${result.customer.id}`} className="flex-1">
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
              Uçuş öncesi risk formunu imzalamanız gerekmektedir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signatureData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-700">Risk Formu İmzalandı</p>
                    <p className="text-sm text-green-600">
                      {new Date().toLocaleDateString('tr-TR')} - {new Date().toLocaleTimeString('tr-TR')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSignatureData(null)
                      setShowWaiverModal(true)
                    }}
                  >
                    Yeniden İmzala
                  </Button>
                </div>
                <div className="border rounded-lg p-2 bg-gray-50">
                  <p className="text-xs text-muted-foreground mb-1">İmza Önizleme:</p>
                  <img
                    src={signatureData}
                    alt="İmza"
                    className="max-h-20 mx-auto"
                  />
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-24 border-dashed border-2"
                onClick={openWaiverModal}
              >
                <div className="flex flex-col items-center gap-2">
                  <PenLine className="w-8 h-8 text-muted-foreground" />
                  <span className="text-lg">Risk Formunu Görüntüle ve İmzala</span>
                </div>
              </Button>
            )}
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
          disabled={loading || !signatureData}
        >
          {loading ? 'Kaydediliyor...' : 'Kaydı Tamamla ve QR Oluştur'}
        </Button>
      </form>
    </div>
  )
}
