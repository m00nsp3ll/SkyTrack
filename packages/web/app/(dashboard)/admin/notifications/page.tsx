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
  Clock,
  Settings,
  Save,
  UserPlus,
  UserCheck,
  XCircle,
  Timer,
  OctagonX,
  ChevronDown,
  ChevronUp,
  Edit3,
  Info,
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

interface NotificationSettingItem {
  enabled: boolean
  label: string
  description: string
  title?: string
  body?: string
}

type NotificationSettings = Record<string, NotificationSettingItem>

const roleLabels: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  ADMIN: { label: 'Yönetici', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield },
  OFFICE_STAFF: { label: 'Kasa', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: ShoppingCart },
  PILOT: { label: 'Pilot', color: 'text-green-700', bgColor: 'bg-green-100', icon: Plane },
  MEDIA_SELLER: { label: 'Foto Satış', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Camera },
  CUSTOM: { label: 'Özel Yetki', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: Shield },
}

const notificationIcons: Record<string, any> = {
  customer_assigned: UserPlus,
  customer_reassigned: UserCheck,
  flight_cancelled: XCircle,
  flight_completed: CheckCircle,
  pilot_limit_warning: Timer,
  pilot_limit_reached: OctagonX,
}

const templateVariableHints: Record<string, string> = {
  customer_assigned: '{customer} = Müşteri adı, {displayId} = Müşteri kodu, {weight} = Kilo',
  customer_reassigned: '{customer} = Müşteri adı, {displayId} = Müşteri kodu, {weight} = Kilo',
  flight_cancelled: '{customer} = Müşteri adı, {displayId} = Müşteri kodu',
  flight_completed: '{customer} = Müşteri adı, {displayId} = Müşteri kodu, {duration} = Süre (dk)',
  pilot_limit_warning: '{current} = Mevcut uçuş, {max} = Maksimum uçuş',
  pilot_limit_reached: '{current} = Mevcut uçuş, {max} = Maksimum uçuş',
}

// Icon'lar fonksiyon olduğu için localStorage'a serialize edilemez
// Bu yüzden id bazlı map kullanıyoruz
const templateIconMap: Record<string, any> = {
  morning: Plane,
  weather: AlertCircle,
  stop: AlertCircle,
  start: CheckCircle,
}

const templateIconColorMap: Record<string, string> = {
  morning: '',
  weather: 'text-yellow-600',
  stop: 'text-red-600',
  start: 'text-green-600',
}

const defaultTemplates = [
  {
    id: 'morning',
    label: 'Günaydın Mesajı (Pilotlar)',
    title: '☀️ Günaydın!',
    body: 'Bugün hava uçuşa müsait. İyi uçuşlar!',
    target: 'pilots',
  },
  {
    id: 'weather',
    label: 'Hava Durumu Uyarısı',
    title: '⚠️ Hava Durumu Uyarısı',
    body: 'Rüzgar şiddeti artıyor. Uçuşlara dikkat!',
    target: 'pilots',
  },
  {
    id: 'stop',
    label: 'Uçuş Durdurma',
    title: '🛑 Uçuşlar Durduruldu',
    body: 'Hava koşulları nedeniyle uçuşlar geçici olarak durdurulmuştur.',
    target: 'pilots',
  },
  {
    id: 'start',
    label: 'Uçuş Başlatma',
    title: '✅ Uçuşlar Başladı',
    body: 'Uçuşlar yeniden başlamıştır. Müsait pilotlar durumlarını güncellesin.',
    target: 'pilots',
  },
]

export default function NotificationsPage() {
  const [tokens, setTokens] = useState<FcmToken[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [expandedSetting, setExpandedSetting] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [templates, setTemplates] = useState(defaultTemplates)

  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    body: '',
    target: 'all',
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

  const fetchSettings = async () => {
    setSettingsLoading(true)
    try {
      const response = await api.get('/fcm/notification-settings')
      setNotifSettings(response.data.data.settings as NotificationSettings)
    } catch (error) {
      console.error('Failed to fetch notification settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
    fetchSettings()
    // Load saved templates from localStorage
    const saved = localStorage.getItem('broadcast_templates')
    if (saved) {
      try {
        setTemplates(JSON.parse(saved))
      } catch {}
    }
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
      let endpoint = ''
      if (broadcastForm.target === 'pilots') {
        endpoint = '/fcm/send-role/PILOT'
      } else if (broadcastForm.target === 'admins') {
        endpoint = '/fcm/send-role/ADMIN'
      } else {
        endpoint = '/fcm/broadcast'
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
      await api.delete(`/fcm/token/${tokenId}`)
      setMessage({ type: 'success', text: 'Cihaz kaldırıldı' })
      fetchTokens()
    } catch (error) {
      setMessage({ type: 'error', text: 'Cihaz kaldırılamadı' })
    }
  }

  const handleToggleSetting = (key: string) => {
    if (!notifSettings) return
    setNotifSettings({
      ...notifSettings,
      [key]: {
        ...notifSettings[key],
        enabled: !notifSettings[key].enabled,
      },
    })
  }

  const handleSettingFieldChange = (key: string, field: 'title' | 'body', value: string) => {
    if (!notifSettings) return
    setNotifSettings({
      ...notifSettings,
      [key]: {
        ...notifSettings[key],
        [field]: value,
      },
    })
  }

  const handleSaveSettings = async () => {
    if (!notifSettings) return
    setSettingsSaving(true)
    try {
      await api.put('/fcm/notification-settings', { settings: notifSettings })
      setMessage({ type: 'success', text: 'Bildirim ayarları kaydedildi' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Bildirim ayarları kaydedilemedi' })
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleTemplateChange = (templateId: string, field: 'title' | 'body' | 'label', value: string) => {
    setTemplates(prev => {
      const updated = prev.map(t => t.id === templateId ? { ...t, [field]: value } : t)
      localStorage.setItem('broadcast_templates', JSON.stringify(updated))
      return updated
    })
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
          <h1 className="text-2xl font-bold">Bildirim Yönetimi</h1>
          <p className="text-muted-foreground">Push bildirimleri ve sistem bildirim ayarları</p>
        </div>
        <Button variant="outline" onClick={() => { fetchTokens(); fetchSettings(); }} disabled={loading}>
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

      {/* System Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Sistem Bildirimleri
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Otomatik sistem bildirimlerini açıp kapatın ve mesaj şablonlarını düzenleyin
          </p>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifSettings ? (
            <div className="space-y-2">
              {Object.entries(notifSettings).map(([key, setting]) => {
                const Icon = notificationIcons[key] || Bell
                const isExpanded = expandedSetting === key
                return (
                  <div
                    key={key}
                    className={`border rounded-lg transition-colors ${
                      setting.enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50/50'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between py-3 px-4">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => setExpandedSetting(isExpanded ? null : key)}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          setting.enabled ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-4.5 h-4.5 ${
                            setting.enabled ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm ${!setting.enabled ? 'text-gray-400' : ''}`}>
                              {setting.label}
                            </p>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSetting(key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                          setting.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            setting.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Expanded edit area */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                        <div className="space-y-3 mt-3">
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Bildirim Başlığı</Label>
                            <Input
                              value={setting.title || ''}
                              onChange={(e) => handleSettingFieldChange(key, 'title', e.target.value)}
                              placeholder="Bildirim başlığı"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Bildirim Mesajı</Label>
                            <Input
                              value={setting.body || ''}
                              onChange={(e) => handleSettingFieldChange(key, 'body', e.target.value)}
                              placeholder="Bildirim mesajı"
                              className="mt-1 text-sm"
                            />
                          </div>
                          {templateVariableHints[key] && (
                            <div className="flex items-start gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-md p-2">
                              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>Kullanılabilir değişkenler: {templateVariableHints[key]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                  {settingsSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Ayarları Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Ayarlar yüklenemedi</p>
          )}
        </CardContent>
      </Card>

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
            <p className="text-sm text-muted-foreground">
              Şablona tıklayarak gönderim formuna aktarın. Kalem ikonuyla düzenleyin.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.map((template) => {
              const TplIcon = templateIconMap[template.id] || Bell
              const tplIconColor = templateIconColorMap[template.id] || ''
              const isEditing = editingTemplate === template.id
              return (
                <div key={template.id} className="border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 justify-start border-0 shadow-none"
                      onClick={() =>
                        setBroadcastForm({
                          title: template.title,
                          body: template.body,
                          target: template.target,
                        })
                      }
                    >
                      <TplIcon className={`w-4 h-4 mr-2 ${tplIconColor}`} />
                      {template.label}
                    </Button>
                    <button
                      onClick={() => setEditingTemplate(isEditing ? null : template.id)}
                      className="p-2 mr-2 rounded hover:bg-gray-100 text-muted-foreground hover:text-gray-700 transition-colors"
                      title="Şablonu düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {isEditing && (
                    <div className="px-4 pb-3 space-y-2 border-t border-gray-100 pt-2">
                      <div>
                        <Label className="text-xs text-gray-500">Şablon Adı</Label>
                        <Input
                          value={template.label}
                          onChange={(e) => handleTemplateChange(template.id, 'label', e.target.value)}
                          className="mt-0.5 text-sm h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Başlık</Label>
                        <Input
                          value={template.title}
                          onChange={(e) => handleTemplateChange(template.id, 'title', e.target.value)}
                          className="mt-0.5 text-sm h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Mesaj</Label>
                        <Input
                          value={template.body}
                          onChange={(e) => handleTemplateChange(template.id, 'body', e.target.value)}
                          className="mt-0.5 text-sm h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
                            <button
                              onClick={() => handleDeleteToken(token.id)}
                              className="ml-1 p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                              title="Cihazı kaldır"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
