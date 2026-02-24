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
  Key,
  Save,
  ChevronDown,
  ChevronRight,
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
  role: 'ADMIN' | 'OFFICE_STAFF' | 'PILOT' | 'MEDIA_SELLER' | 'CUSTOM'
  isActive: boolean
  pilotId: string | null
  pilot: { id: string; name: string } | null
  createdAt: string
  _count: {
    salesMade: number
    salesCollected: number
  }
}

interface RolePermission {
  id: string
  role: string
  permissions: {
    groups: Record<string, boolean>
    items: Record<string, boolean>
  }
  updatedAt: string
}

const roleLabels: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  ADMIN: { label: 'Yönetici', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield },
  OFFICE_STAFF: { label: 'Kasa Personeli', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: ShoppingCart },
  PILOT: { label: 'Pilot', color: 'text-green-700', bgColor: 'bg-green-100', icon: UserCog },
  MEDIA_SELLER: { label: 'Foto Satış', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Camera },
  CUSTOM: { label: 'Özel Yetki', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: Key },
}

// Menu structure matching Sidebar
const menuStructure = [
  {
    groupKey: 'GENEL',
    groupLabel: 'GENEL',
    items: [
      { href: '/admin', label: 'Ana Panel' },
    ],
  },
  {
    groupKey: 'OPERASYON',
    groupLabel: 'OPERASYON',
    items: [
      { href: '/admin/customers/new', label: 'Müşteri Kayıt' },
      { href: '/admin/scan', label: 'QR Tara' },
      { href: '/admin/customers', label: 'Müşteri Listesi' },
      { href: '/admin/flights', label: 'Uçuş Takibi' },
    ],
  },
  {
    groupKey: 'PILOT_YONETIMI',
    groupLabel: 'PİLOT YÖNETİMİ',
    items: [
      { href: '/admin/pilots', label: 'Pilotlar' },
      { href: '/admin/pilots/queue', label: 'Pilot Sırası' },
    ],
  },
  {
    groupKey: 'MEDYA',
    groupLabel: 'MEDYA',
    items: [
      { href: '/admin/media', label: 'Foto/Video Raporu' },
      { href: '/admin/media/seller', label: 'Önizleme İstasyonu' },
      { href: '/admin/media/pos', label: 'Foto/Video Satış' },
    ],
  },
  {
    groupKey: 'SATIS',
    groupLabel: 'SATIŞ',
    items: [
      { href: '/pos', label: 'POS Satış Ekranı' },
      { href: '/admin/products', label: 'Ürün Yönetimi' },
      { href: '/admin/sales/unpaid', label: 'Ödenmemiş Satışlar' },
    ],
  },
  {
    groupKey: 'RAPORLAR',
    groupLabel: 'RAPORLAR',
    items: [
      { href: '/admin/sales/daily', label: 'Kasa Raporu' },
      { href: '/admin/reports/cashier', label: 'Vezne Raporu' },
      { href: '/admin/reports/pilots', label: 'Pilot Raporu' },
      { href: '/admin/reports/revenue', label: 'Gelir Raporu' },
      { href: '/admin/reports/customers', label: 'Müşteri Akışı' },
      { href: '/admin/reports/compare', label: 'Dönem Karşılaştırma' },
    ],
  },
  {
    groupKey: 'SISTEM',
    groupLabel: 'SİSTEM',
    items: [
      { href: '/admin/notifications', label: 'Bildirimler' },
      { href: '/admin/staff', label: 'Personel Yönetimi' },
      { href: '/admin/reports/system', label: 'Sistem İzleme' },
      { href: '/admin/settings', label: 'Ayarlar' },
    ],
  },
]

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'roles'>('list')
  const [users, setUsers] = useState<User[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [filterRole, setFilterRole] = useState('all')

  // Roles tab state
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [editedPerms, setEditedPerms] = useState<Record<string, any>>({})
  const [savingRole, setSavingRole] = useState<string | null>(null)

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

  const fetchPermissions = async () => {
    setLoadingPerms(true)
    try {
      const res = await api.get('/users/permissions')
      setRolePermissions(res.data.data || [])
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setLoadingPerms(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchPermissions()
    }
  }, [activeTab])

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({ username: '', password: '', role: 'OFFICE_STAFF', pilotId: '' })
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

  const getAvailablePilots = () => {
    const assignedPilotIds = users.filter(u => u.pilotId).map(u => u.pilotId)
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
    custom: users.filter(u => u.role === 'CUSTOM').length,
  }

  // ============ ROLES TAB HELPERS ============

  const getPermsForRole = (role: string) => {
    if (editedPerms[role]) return editedPerms[role]
    const found = rolePermissions.find(rp => rp.role === role)
    return found?.permissions || { groups: {}, items: {} }
  }

  const updatePerm = (role: string, type: 'groups' | 'items', key: string, value: boolean) => {
    const current = { ...getPermsForRole(role) }
    current[type] = { ...current[type], [key]: value }

    // If toggling a group, toggle all items in that group
    if (type === 'groups') {
      const group = menuStructure.find(g => g.groupKey === key)
      if (group) {
        current.items = { ...current.items }
        group.items.forEach(item => {
          current.items[item.href] = value
        })
      }
    }

    // If toggling an item, update group state
    if (type === 'items') {
      const group = menuStructure.find(g => g.items.some(i => i.href === key))
      if (group) {
        const allEnabled = group.items.every(i => (i.href === key ? value : current.items[i.href]))
        const anyEnabled = group.items.some(i => (i.href === key ? value : current.items[i.href]))
        current.groups = { ...current.groups, [group.groupKey]: allEnabled }
      }
    }

    setEditedPerms(prev => ({ ...prev, [role]: current }))
  }

  const getGroupState = (role: string, groupKey: string): 'all' | 'some' | 'none' => {
    const perms = getPermsForRole(role)
    const group = menuStructure.find(g => g.groupKey === groupKey)
    if (!group) return 'none'
    const enabledCount = group.items.filter(i => perms.items[i.href]).length
    if (enabledCount === group.items.length) return 'all'
    if (enabledCount > 0) return 'some'
    return 'none'
  }

  const saveRolePermissions = async (role: string) => {
    const perms = editedPerms[role]
    if (!perms) return

    setSavingRole(role)
    try {
      await api.put(`/users/permissions/${role}`, { permissions: perms })
      await fetchPermissions()
      setEditedPerms(prev => {
        const next = { ...prev }
        delete next[role]
        return next
      })
      alert('Yetkiler kaydedildi')
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Kaydetme başarısız')
    } finally {
      setSavingRole(null)
    }
  }

  const hasChanges = (role: string) => !!editedPerms[role]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personel Yönetimi</h1>
          <p className="text-muted-foreground">Kullanıcı hesaplarını ve rol yetkilerini yönetin</p>
        </div>
        {activeTab === 'list' && (
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Personel
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Personel Listesi
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roles'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Personel Rolleri
        </button>
      </div>

      {/* ============ LIST TAB ============ */}
      {activeTab === 'list' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
            <Card className="cursor-pointer hover:bg-indigo-50" onClick={() => setFilterRole(filterRole === 'CUSTOM' ? 'all' : 'CUSTOM')}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{stats.custom}</p>
                  <p className="text-xs text-muted-foreground">Özel Yetki</p>
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
                      <div key={user.id} className="flex items-center justify-between py-4">
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
        </>
      )}

      {/* ============ ROLES TAB ============ */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {loadingPerms ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            ['ADMIN', 'OFFICE_STAFF', 'PILOT', 'MEDIA_SELLER', 'CUSTOM'].map(role => {
              const roleInfo = roleLabels[role]
              const RoleIcon = roleInfo.icon
              const isExpanded = expandedRole === role
              const isAdmin = role === 'ADMIN'
              const perms = getPermsForRole(role)
              const changed = hasChanges(role)

              return (
                <Card key={role} className={changed ? 'ring-2 ring-primary' : ''}>
                  <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => setExpandedRole(isExpanded ? null : role)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleInfo.bgColor}`}>
                          <RoleIcon className={`w-5 h-5 ${roleInfo.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{roleInfo.label}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {isAdmin ? 'Tüm yetkiler (değiştirilemez)' : `${role}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {changed && (
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); saveRolePermissions(role) }}
                            disabled={savingRole === role}
                          >
                            {savingRole === role ? (
                              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            Kaydet
                          </Button>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {menuStructure.map(group => {
                          const groupState = getGroupState(role, group.groupKey)
                          const isGroupChecked = groupState === 'all'
                          const isIndeterminate = groupState === 'some'

                          return (
                            <div key={group.groupKey} className="border rounded-lg p-3">
                              {/* Group toggle */}
                              <label className={`flex items-center gap-3 ${isAdmin ? 'opacity-60' : 'cursor-pointer'}`}>
                                <input
                                  type="checkbox"
                                  checked={isGroupChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = isIndeterminate
                                  }}
                                  onChange={(e) => updatePerm(role, 'groups', group.groupKey, e.target.checked)}
                                  disabled={isAdmin}
                                  className="w-4 h-4 rounded accent-primary"
                                />
                                <span className="font-semibold text-sm">{group.groupLabel}</span>
                              </label>

                              {/* Item toggles */}
                              <div className="ml-7 mt-2 space-y-1.5">
                                {group.items.map(item => (
                                  <label
                                    key={item.href}
                                    className={`flex items-center gap-3 ${isAdmin ? 'opacity-60' : 'cursor-pointer'}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!perms.items[item.href]}
                                      onChange={(e) => updatePerm(role, 'items', item.href, e.target.checked)}
                                      disabled={isAdmin}
                                      className="w-3.5 h-3.5 rounded accent-primary"
                                    />
                                    <span className="text-sm text-gray-700">{item.label}</span>
                                    <span className="text-xs text-gray-400">{item.href}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

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
