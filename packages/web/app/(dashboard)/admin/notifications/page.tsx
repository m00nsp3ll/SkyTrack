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
} from 'lucide-react'

interface Subscription {
  id: string
  userId: string
  device: string | null
  isActive: boolean
  createdAt: string
  user: {
    id: string
    username: string
    name: string | null
    role: string
  }
}

interface SubscriptionStats {
  total: number
  active: number
  byRole: Record<string, number>
  byDevice: Record<string, number>
}

const roleLabels: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  ADMIN: { label: 'Yönetici', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield },
  OFFICE_STAFF: { label: 'Kasa', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: ShoppingCart },
  PILOT: { label: 'Pilot', color: 'text-green-700', bgColor: 'bg-green-100', icon: Plane },
  MEDIA_SELLER: { label: 'Foto Satış', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Camera },
}

export default function NotificationsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [testingUser, setTestingUser] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    body: '',
    url: '/',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await api.get('/push/subscriptions')
      const data = response.data.data
      setSubscriptions(data.subscriptions || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
      setMessage({ type: 'error', text: 'Abonelikler yüklenemedi' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastForm.title || !broadcastForm.body) {
      setMessage({ type: 'error', text: 'Başlık ve mesaj zorunludur' })
      return
    }

    setSending(true)
    try {
      const response = await api.post('/push/broadcast', broadcastForm)
      const result = response.data.data
      setMessage({
        type: 'success',
        text: `Bildirim gönderildi: ${result.sent} başarılı, ${result.failed} başarısız`,
      })
      setBroadcastForm({ title: '', body: '', url: '/' })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error?.message || 'Bildirim gönderilemedi',
      })
    } finally {
      setSending(false)
    }
  }

  const handleTestNotification = async (userId: string) => {
    setTestingUser(userId)
    try {
      const response = await api.post(`/push/test/${userId}`)
      const result = response.data.data
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.success
          ? `Test bildirimi gönderildi (${result.sent} cihaz)`
          : 'Test bildirimi gönderilemedi',
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error?.message || 'Test bildirimi gönderilemedi',
      })
    } finally {
      setTestingUser(null)
    }
  }

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Bu aboneliği silmek istediğinize emin misiniz?')) return

    try {
      // We need to call unsubscribe endpoint
      await api.delete(`/push/subscription/${subscriptionId}`)
      await fetchData()
      setMessage({ type: 'success', text: 'Abonelik silindi' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Abonelik silinemedi' })
    }
  }

  // Group subscriptions by user
  const groupedByUser = subscriptions.reduce((acc, sub) => {
    const userId = sub.userId
    if (!acc[userId]) {
      acc[userId] = {
        user: sub.user,
        subscriptions: [],
      }
    }
    acc[userId].subscriptions.push(sub)
    return acc
  }, {} as Record<string, { user: Subscription['user']; subscriptions: Subscription[] }>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bildirim Yönetimi</h1>
          <p className="text-muted-foreground">Push bildirimlerini yönetin ve gönderin</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
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
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Toplam Abonelik</p>
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
                <p className="text-3xl font-bold text-blue-600">
                  {Object.keys(groupedByUser).length}
                </p>
                <p className="text-xs text-muted-foreground">Kullanıcı</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {stats.byRole?.PILOT || 0}
                </p>
                <p className="text-xs text-muted-foreground">Pilot Abonelik</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

              <div className="space-y-2">
                <Label htmlFor="url">Tıklanınca Açılacak Sayfa</Label>
                <Input
                  id="url"
                  value={broadcastForm.url}
                  onChange={(e) =>
                    setBroadcastForm({ ...broadcastForm, url: e.target.value })
                  }
                  placeholder="/pilot veya /admin"
                />
              </div>

              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Tüm Kullanıcılara Gönder ({stats?.active || 0} cihaz)
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Hızlı Bildirimler
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
                  url: '/pilot',
                })
              }
            >
              <Plane className="w-4 h-4 mr-2" />
              Günaydın Mesajı
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() =>
                setBroadcastForm({
                  title: '⚠️ Hava Durumu Uyarısı',
                  body: 'Rüzgar şiddeti artıyor. Dikkatli olun!',
                  url: '/pilot',
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
                  url: '/pilot',
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
                  body: 'Uçuşlar yeniden başlamıştır. Müsait pilotlar panelden durumlarını güncellesin.',
                  url: '/pilot',
                })
              }
            >
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Uçuş Başlatma
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bildirim Abonelikleri ({subscriptions.length})
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
              <p>Henüz bildirim aboneliği yok</p>
              <p className="text-sm">Kullanıcılar pilot panelinden bildirimleri açabilir</p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.values(groupedByUser).map(({ user, subscriptions: userSubs }) => {
                const role = roleLabels[user.role]
                const RoleIcon = role?.icon || Users
                return (
                  <div key={user.id} className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${role?.bgColor}`}
                        >
                          <RoleIcon className={`w-5 h-5 ${role?.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold">{user.name || user.username}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${role?.bgColor} ${role?.color}`}
                          >
                            {role?.label}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestNotification(user.id)}
                        disabled={testingUser === user.id}
                      >
                        {testingUser === user.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-1" />
                            Test
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="ml-13 space-y-1">
                      {userSubs.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span>{sub.device || 'Bilinmeyen Cihaz'}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs ${
                                sub.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {sub.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(sub.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteSubscription(sub.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
