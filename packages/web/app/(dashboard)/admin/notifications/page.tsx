'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import {
  Bell,
  Send,
  Users,
  RefreshCw,
  Smartphone,
  Trash2,
  CheckCircle,
  AlertCircle,
  Plane,
  ShoppingCart,
  Shield,
  Camera,
  Radio,
  Clock,
} from 'lucide-react'

interface FcmToken {
  id: string
  userId: string
  token: string
  device: string | null
  platform: string | null
  isActive: boolean
  createdAt: string
  user: {
    id: string
    username: string
    role: string
  }
}

const roleLabels: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  ADMIN: { label: 'Yönetici', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield },
  OFFICE_STAFF: { label: 'Kasa', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: ShoppingCart },
  PILOT: { label: 'Pilot', color: 'text-green-700', bgColor: 'bg-green-100', icon: Plane },
  MEDIA_SELLER: { label: 'Foto Satış', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Camera },
  CUSTOM: { label: 'Özel Yetki', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: Shield },
}

export default function NotificationsPage() {
  const [tokens, setTokens] = useState<FcmToken[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    body: '',
    target: 'all', // 'all', 'pilots', 'admins'
  })

  const fetchTokens = async () => {
    setLoading(true)
    try {
      const response = await api.get('/fcm/tokens')
      setTokens(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch FCM tokens:', error)
      setMessage({ type: 'error', text: 'FCM cihazları yüklenemedi' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [])

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastForm.title || !broadcastForm.body) {
      setMessage({ type: 'error', text: 'Başlık ve mesaj zorunludur' })
      return
    }

    if (!confirm(`${broadcastForm.title}\n\n${broadcastForm.body}\n\nBu bildirimi göndermek istediğinize emin misiniz?`)) {
      return
    }

    setSending(true)
    try {
      // TODO: Backend'de toplu FCM endpoint'i oluşturulacak
      // Şimdilik her role için ayrı istek yapıyoruz
      let endpoint = ''
      if (broadcastForm.target === 'pilots') {
        endpoint = '/push/role/PILOT' // Geçici - FCM'e çevrilecek
      } else if (broadcastForm.target === 'admins') {
        endpoint = '/push/role/ADMIN' // Geçici - FCM'e çevrilecek
      } else {
        endpoint = '/push/broadcast' // Geçici - FCM'e çevrilecek
      }

      await api.post(endpoint, {
        title: broadcastForm.title,
        body: broadcastForm.body,
      })

      setMessage({
        type: 'success',
        text: 'Bildirim gönderildi!',
      })
      setBroadcastForm({ title: '', body: '', target: 'all' })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error?.message || 'Bildirim gönderilemedi',
      })
    } finally {
      setSending(false)
    }
  }

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Bu cihazı kaldırmak istediğinize emin misiniz?')) return

    try {
      // TODO: Backend'de FCM token silme endpoint'i eklenecek
      setMessage({ type: 'success', text: 'Cihaz kaldırıldı (geliştiriliyor)' })
      fetchTokens()
    } catch (error) {
      setMessage({ type: 'error', text: 'Cihaz kaldırılamadı' })
    }
  }

  // Group tokens by user
  const groupedByUser = tokens.reduce((acc, token) => {
    const userId = token.userId
    if (!acc[userId]) {
      acc[userId] = {
        user: token.user,
        tokens: [],
      }
    }
    acc[userId].tokens.push(token)
    return acc
  }, {} as Record<string, { user: FcmToken['user']; tokens: FcmToken[] }>)

  // Calculate stats
  const stats = {
    total: tokens.length,
    active: tokens.filter(t => t.isActive).length,
    pilots: tokens.filter(t => t.user.role === 'PILOT').length,
    admins: tokens.filter(t => ['ADMIN', 'OFFICE_STAFF'].includes(t.user.role)).length,
    android: tokens.filter(t => t.platform?.toLowerCase() === 'android').length,
    ios: tokens.filter(t => t.platform?.toLowerCase() === 'ios').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bildirim Yönetimi (FCM)</h1>
          <p className="text-muted-foreground">Firebase Cloud Messaging ile native push bildirimleri</p>
        </div>
        <Button variant="outline" onClick={fetchTokens} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Radio className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Native Push Notification Sistemi</p>
            <p className="text-sm text-blue-700 mt-1">
              PWA push sistemi devre dışı bırakıldı. Artık Firebase FCM kullanıyoruz.
              Android APK ve iOS uygulamaları native bildirim alır.
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
          <button
            className="ml-auto text-sm underline"
            onClick={() => setMessage(null)}
          >
            Kapat
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Toplam Cihaz</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Aktif</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.pilots}</p>
              <p className="text-xs text-muted-foreground">Pilot Cihazı</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {stats.android + stats.ios}
              </p>
              <p className="text-xs text-muted-foreground">
                Android: {stats.android} / iOS: {stats.ios}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Broadcast Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Toplu Bildirim Gönder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target">Hedef Kitle *</Label>
                <select
                  id="target"
                  value={broadcastForm.target}
                  onChange={(e) =>
                    setBroadcastForm({ ...broadcastForm, target: e.target.value })
                  }
                  className="w-full border rounded-md p-2"
                >
                  <option value="all">Tüm Kullanıcılar ({stats.active} cihaz)</option>
                  <option value="pilots">Sadece Pilotlar ({stats.pilots} cihaz)</option>
                  <option value="admins">Sadece Adminler ({stats.admins} cihaz)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Başlık *</Label>
                <Input
                  id="title"
                  value={broadcastForm.title}
                  onChange={(e) =>
                    setBroadcastForm({ ...broadcastForm, title: e.target.value })
                  }
                  placeholder="Bildirim başlığı"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Mesaj *</Label>
                <Textarea
                  id="body"
                  value={broadcastForm.body}
                  onChange={(e) =>
                    setBroadcastForm({ ...broadcastForm, body: e.target.value })
                  }
                  placeholder="Bildirim mesajı"
                  rows={3}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Gönder
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Hızlı Şablonlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() =>
                setBroadcastForm({
                  title: '☀️ Günaydın!',
                  body: 'Bugün hava uçuşa müsait. İyi uçuşlar!',
                  target: 'pilots',
                })
              }
            >
              <Plane className="w-4 h-4 mr-2" />
              Günaydın Mesajı (Pilotlar)
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() =>
                setBroadcastForm({
                  title: '⚠️ Hava Durumu Uyarısı',
                  body: 'Rüzgar şiddeti artıyor. Uçuşlara dikkat!',
                  target: 'pilots',
                })
              }
            >
              <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />
              Hava Durumu Uyarısı
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() =>
                setBroadcastForm({
                  title: '🛑 Uçuşlar Durduruldu',
                  body: 'Hava koşulları nedeniyle uçuşlar geçici olarak durdurulmuştur.',
                  target: 'pilots',
                })
              }
            >
              <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
              Uçuş Durdurma
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() =>
                setBroadcastForm({
                  title: '✅ Uçuşlar Başladı',
                  body: 'Uçuşlar yeniden başlamıştır. Müsait pilotlar durumlarını güncellesin.',
                  target: 'pilots',
                })
              }
            >
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Uçuş Başlatma
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FCM Tokens List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Kayıtlı Cihazlar ({tokens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(groupedByUser).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Henüz kayıtlı cihaz yok</p>
              <p className="text-sm">Kullanıcılar mobil uygulamadan giriş yapınca otomatik kaydedilir</p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.values(groupedByUser).map(({ user, tokens: userTokens }) => {
                const role = roleLabels[user.role]
                const RoleIcon = role?.icon || Users
                return (
                  <div key={user.id} className="py-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${role?.bgColor}`}
                      >
                        <RoleIcon className={`w-5 h-5 ${role?.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{user.username}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${role?.bgColor} ${role?.color}`}
                        >
                          {role?.label}
                        </span>
                      </div>
                    </div>

                    <div className="ml-13 space-y-1">
                      {userTokens.map((token) => (
                        <div
                          key={token.id}
                          className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span>{token.platform || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">
                              {token.device?.slice(0, 30) || 'Device'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs ${
                                token.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {token.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(token.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
