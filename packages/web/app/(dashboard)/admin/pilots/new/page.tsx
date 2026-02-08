'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { pilotsApi } from '@/lib/api'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

export default function NewPilotPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    maxDailyFlights: 7,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Pilot adı gerekli')
      return
    }

    if (!formData.phone.trim()) {
      setError('Telefon numarası gerekli')
      return
    }

    // Validate phone format (05XX XXX XX XX)
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith('05')) {
      setError('Geçerli bir telefon numarası girin (05XX XXX XX XX)')
      return
    }

    setLoading(true)

    try {
      await pilotsApi.create({
        name: formData.name.trim(),
        phone: phoneDigits,
        email: formData.email.trim() || undefined,
        maxDailyFlights: formData.maxDailyFlights,
      })

      router.push('/admin/pilots')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Pilot oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/pilots">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Yeni Pilot Ekle</h1>
          <p className="text-muted-foreground">Yeni bir pilot kaydı oluşturun</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Pilot Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad *</Label>
                <Input
                  id="name"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="pilot@ornek.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDailyFlights">Günlük Maksimum Uçuş</Label>
                <Input
                  id="maxDailyFlights"
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
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Pilot günde en fazla kaç uçuş yapabilir? (Varsayılan: 7)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Pilot Ekle
                  </>
                )}
              </Button>
              <Link href="/admin/pilots">
                <Button type="button" variant="outline" disabled={loading}>
                  İptal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
