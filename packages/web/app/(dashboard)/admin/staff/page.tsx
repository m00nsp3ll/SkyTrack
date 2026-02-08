'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Check,
  Eye,
  EyeOff,
  Shield,
  Camera,
  ShoppingCart,
  UserCog,
} from 'lucide-react'

interface Pilot {
  id: string
  name: string
  phone: string
}

interface User {
  id: string
  username: string
  name: string | null
  role: 'ADMIN' | 'OFFICE_STAFF' | 'PILOT' | 'MEDIA_SELLER'
  isActive: boolean
  pilotId: string | null
  pilot: { id: string; name: string } | null
  createdAt: string
  _count: {
    salesMade: number
    salesCollected: number
  }
}

const roleLabels: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  ADMIN: { label: 'Yönetici', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield },
  OFFICE_STAFF: { label: 'Kasa Personeli', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: ShoppingCart },
  PILOT: { label: 'Pilot', color: 'text-green-700', bgColor: 'bg-green-100', icon: UserCog },
  MEDIA_SELLER: { label: 'Foto Satış', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Camera },
}

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [filterRole, setFilterRole] = useState('all')

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'OFFICE_STAFF',
    pilotId: '',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, pilotsRes] = await Promise.all([
        api.get('/users'),
        api.get('/pilots'),
      ])
      setUsers(usersRes.data.data || [])
      setPilots(pilotsRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      password: '',
      role: 'OFFICE_STAFF',
      pilotId: '',
    })
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      pilotId: user.pilotId || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload: any = {
        username: formData.username,
        role: formData.role,
        pilotId: formData.role === 'PILOT' ? formData.pilotId : null,
      }

      if (formData.password) {
        payload.password = formData.password
      }

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload)
      } else {
        if (!formData.password) {
          alert('Şifre zorunludur')
          setSaving(false)
          return
        }
        payload.password = formData.password
        await api.post('/users', payload)
      }
      setShowModal(false)
      await fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'İşlem başarısız')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`${user.name || user.username} kullanıcısını silmek istediğinize emin misiniz?`)) return

    try {
      await api.delete(`/users/${user.id}`)
      await fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Silme başarısız')
    }
  }

  // Get pilots that are not assigned to any user
  const getAvailablePilots = () => {
    const assignedPilotIds = users.filter(u => u.pilotId).map(u => u.pilotId)
    // If editing, include the current user's pilot
    if (editingUser?.pilotId) {
      return pilots.filter(p => !assignedPilotIds.includes(p.id) || p.id === editingUser.pilotId)
    }
    return pilots.filter(p => !assignedPilotIds.includes(p.id))
  }

  const filteredUsers = filterRole === 'all'
    ? users
    : users.filter(u => u.role === filterRole)

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    officeStaff: users.filter(u => u.role === 'OFFICE_STAFF').length,
    mediaSellers: users.filter(u => u.role === 'MEDIA_SELLER').length,
    pilots: users.filter(u => u.role === 'PILOT').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personel Yönetimi</h1>
          <p className="text-muted-foreground">Kullanıcı hesaplarını yönetin</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Personel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Toplam</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-purple-50" onClick={() => setFilterRole(filterRole === 'ADMIN' ? 'all' : 'ADMIN')}>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">Yönetici</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-blue-50" onClick={() => setFilterRole(filterRole === 'OFFICE_STAFF' ? 'all' : 'OFFICE_STAFF')}>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.officeStaff}</p>
              <p className="text-xs text-muted-foreground">Kasa</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-orange-50" onClick={() => setFilterRole(filterRole === 'MEDIA_SELLER' ? 'all' : 'MEDIA_SELLER')}>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.mediaSellers}</p>
              <p className="text-xs text-muted-foreground">Foto Satış</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-green-50" onClick={() => setFilterRole(filterRole === 'PILOT' ? 'all' : 'PILOT')}>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.pilots}</p>
              <p className="text-xs text-muted-foreground">Pilot</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter badge */}
      {filterRole !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtre:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleLabels[filterRole]?.bgColor} ${roleLabels[filterRole]?.color}`}>
            {roleLabels[filterRole]?.label}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setFilterRole('all')}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Personel Listesi ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Personel bulunamadı</p>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((user) => {
                const role = roleLabels[user.role]
                const RoleIcon = role?.icon || Users
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${role?.bgColor}`}>
                        <RoleIcon className={`w-6 h-6 ${role?.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{user.name || user.username}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${role?.bgColor} ${role?.color}`}>
                          {role?.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right text-sm">
                        <p className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(user)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingUser ? 'Personel Düzenle' : 'Yeni Personel'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="kullanici_adi"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Şifre {editingUser ? '(Boş bırakırsan değişmez)' : '*'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required={!editingUser}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rol *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(roleLabels).map(([key, value]) => {
                    const RoleIcon = value.icon
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: key, pilotId: key !== 'PILOT' ? '' : formData.pilotId })}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          formData.role === key
                            ? `${value.bgColor} border-current ${value.color}`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RoleIcon className={`w-5 h-5 ${formData.role === key ? value.color : 'text-gray-400'}`} />
                          <span className={`text-sm font-medium ${formData.role === key ? value.color : ''}`}>
                            {value.label}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Pilot Selection - only show when role is PILOT */}
              {formData.role === 'PILOT' && (
                <div className="space-y-2">
                  <Label htmlFor="pilotId">Pilot Seçin *</Label>
                  <select
                    id="pilotId"
                    value={formData.pilotId}
                    onChange={(e) => setFormData({ ...formData, pilotId: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="">-- Pilot Seçin --</option>
                    {getAvailablePilots().map((pilot) => (
                      <option key={pilot.id} value={pilot.id}>
                        {pilot.name} ({pilot.phone})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Pilot listesine yeni pilot eklemek için Pilot Yönetimi sayfasını kullanın
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  İptal
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {editingUser ? 'Güncelle' : 'Oluştur'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
