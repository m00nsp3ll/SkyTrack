'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Plane,
  UserCheck,
  Camera,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  QrCode,
  UserPlus,
  Package,
  Receipt,
  TrendingUp,
  UserCog,
  Calendar,
  GitCompare,
  Server,
  ListOrdered,
  Eye,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cleanupFcmToken } from '@/lib/nativePush'

interface MenuItem {
  href: string
  label: string
  icon: any
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    title: 'GENEL',
    items: [
      { href: '/admin', label: 'Ana Panel', icon: LayoutDashboard },
    ],
  },
  {
    title: 'OPERASYON',
    items: [
      { href: '/admin/customers/new', label: 'Müşteri Kayıt', icon: UserPlus },
      { href: '/admin/scan', label: 'QR Tara', icon: QrCode },
      { href: '/admin/customers', label: 'Müşteri Listesi', icon: Users },
      { href: '/admin/flights', label: 'Uçuş Takibi', icon: Plane },
    ],
  },
  {
    title: 'PİLOT YÖNETİMİ',
    items: [
      { href: '/admin/pilots', label: 'Pilotlar', icon: UserCheck },
      { href: '/admin/pilots/queue', label: 'Pilot Sırası', icon: ListOrdered },
    ],
  },
  {
    title: 'MEDYA',
    items: [
      { href: '/admin/media', label: 'Medya Yönetimi', icon: Camera },
      { href: '/admin/media/seller', label: 'Önizleme İstasyonu', icon: Eye },
    ],
  },
  {
    title: 'SATIŞ',
    items: [
      { href: '/pos', label: 'POS Satış Ekranı', icon: ShoppingCart },
      { href: '/admin/products', label: 'Ürün Yönetimi', icon: Package },
      { href: '/admin/sales/unpaid', label: 'Ödenmemiş Satışlar', icon: CreditCard },
    ],
  },
  {
    title: 'RAPORLAR',
    items: [
      { href: '/admin/sales/daily', label: 'Kasa Raporu', icon: Calendar },
      { href: '/admin/reports/cashier', label: 'Vezne Raporu', icon: Receipt },
      { href: '/admin/reports/pilots', label: 'Pilot Raporu', icon: UserCog },
      { href: '/admin/reports/revenue', label: 'Gelir Raporu', icon: TrendingUp },
      { href: '/admin/reports/customers', label: 'Müşteri Akışı', icon: BarChart3 },
      { href: '/admin/reports/compare', label: 'Dönem Karşılaştırma', icon: GitCompare },
    ],
  },
  {
    title: 'SİSTEM',
    items: [
      { href: '/admin/notifications', label: 'Bildirimler', icon: Bell },
      { href: '/admin/staff', label: 'Personel Yönetimi', icon: UserCog },
      { href: '/admin/reports/system', label: 'Sistem İzleme', icon: Server },
      { href: '/admin/settings', label: 'Ayarlar', icon: Settings },
    ],
  },
]

// Group title to permission key mapping
const groupPermissionKeys: Record<string, string> = {
  'GENEL': 'GENEL',
  'OPERASYON': 'OPERASYON',
  'PİLOT YÖNETİMİ': 'PILOT_YONETIMI',
  'MEDYA': 'MEDYA',
  'SATIŞ': 'SATIS',
  'RAPORLAR': 'RAPORLAR',
  'SİSTEM': 'SISTEM',
}

function getFilteredMenuGroups(): MenuGroup[] {
  if (typeof window === 'undefined') return menuGroups

  const userStr = localStorage.getItem('user')
  if (!userStr) return menuGroups

  const user = JSON.parse(userStr)
  if (user.role === 'ADMIN') return menuGroups

  const permStr = localStorage.getItem('permissions')
  if (!permStr) return menuGroups

  try {
    const permissions = JSON.parse(permStr)
    if (!permissions || !permissions.items) return menuGroups

    return menuGroups
      .map(group => {
        const groupKey = groupPermissionKeys[group.title]
        // If group is entirely disabled, skip it
        if (groupKey && permissions.groups && permissions.groups[groupKey] === false) {
          // Check if any individual items are enabled
          const hasEnabledItem = group.items.some(item => permissions.items[item.href] === true)
          if (!hasEnabledItem) return null
        }

        // Filter items
        const filteredItems = group.items.filter(item => {
          return permissions.items[item.href] !== false
        })

        if (filteredItems.length === 0) return null
        return { ...group, items: filteredItems }
      })
      .filter(Boolean) as MenuGroup[]
  } catch {
    return menuGroups
  }
}

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [filteredGroups, setFilteredGroups] = useState<MenuGroup[]>(menuGroups)

  useEffect(() => {
    setFilteredGroups(getFilteredMenuGroups())
  }, [])

  const handleLogout = async () => {
    await cleanupFcmToken()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
    window.location.href = '/login'
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'border-b border-gray-200 flex items-center',
        isCollapsed ? 'p-3 justify-center' : 'p-4 justify-between'
      )}>
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-primary">SkyTrack</h1>
            <p className="text-xs text-muted-foreground">Yönetim Paneli</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filteredGroups.map((group, groupIndex) => (
          <div key={group.title} className="mb-1">
            {/* Group Title */}
            {!isCollapsed && (
              <div className="px-4 py-2">
                <span className="text-[10px] font-semibold text-gray-400 tracking-wider">
                  {group.title}
                </span>
              </div>
            )}

            {/* Group Items */}
            <ul className="px-2 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary-foreground')} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Divider between groups */}
            {groupIndex < filteredGroups.length - 1 && (
              <div className="mx-4 my-2 border-b border-gray-100" />
            )}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-200">
        <Button
          variant="ghost"
          className={cn(
            'w-full text-gray-600 hover:text-destructive hover:bg-destructive/10',
            isCollapsed ? 'justify-center px-2' : 'justify-start'
          )}
          onClick={handleLogout}
          title={isCollapsed ? 'Çıkış Yap' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">Çıkış Yap</span>}
        </Button>
      </div>
    </aside>
  )
}
