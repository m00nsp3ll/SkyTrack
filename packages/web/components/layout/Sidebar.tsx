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
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cleanupFcmToken } from '@/lib/nativePush'

interface MenuItem {
  href: string
  label: string
  icon: any
  color: string      // icon rengi (aktif değilken)
  activeBg: string   // aktif arka plan
  activeText: string // aktif yazı rengi
  hoverBg: string
}

interface MenuGroup {
  title: string
  titleColor: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    title: 'GENEL',
    titleColor: 'text-gray-400',
    items: [
      { href: '/admin', label: 'Ana Panel', icon: LayoutDashboard,
        color: 'text-gray-500', activeBg: 'bg-gray-700', activeText: 'text-white', hoverBg: 'hover:bg-gray-100' },
    ],
  },
  {
    title: 'OPERASYON',
    titleColor: 'text-green-600',
    items: [
      { href: '/admin/customers/new', label: 'Müşteri Kayıt', icon: UserPlus,
        color: 'text-green-600', activeBg: 'bg-green-600', activeText: 'text-white', hoverBg: 'hover:bg-green-50' },
      { href: '/admin/scan', label: 'QR Tara', icon: QrCode,
        color: 'text-green-600', activeBg: 'bg-green-600', activeText: 'text-white', hoverBg: 'hover:bg-green-50' },
      { href: '/admin/customers', label: 'Müşteri Listesi', icon: Users,
        color: 'text-green-600', activeBg: 'bg-green-600', activeText: 'text-white', hoverBg: 'hover:bg-green-50' },
      { href: '/admin/flights', label: 'Uçuş Takibi', icon: Plane,
        color: 'text-green-600', activeBg: 'bg-green-600', activeText: 'text-white', hoverBg: 'hover:bg-green-50' },
    ],
  },
  {
    title: 'PİLOT YÖNETİMİ',
    titleColor: 'text-blue-600',
    items: [
      { href: '/admin/pilots', label: 'Pilotlar', icon: UserCheck,
        color: 'text-blue-600', activeBg: 'bg-blue-600', activeText: 'text-white', hoverBg: 'hover:bg-blue-50' },
      { href: '/admin/pilots/queue', label: 'Pilot Sırası', icon: ListOrdered,
        color: 'text-blue-600', activeBg: 'bg-blue-600', activeText: 'text-white', hoverBg: 'hover:bg-blue-50' },
    ],
  },
  {
    title: 'MEDYA',
    titleColor: 'text-purple-600',
    items: [
      { href: '/admin/media', label: 'Foto/Video Raporu', icon: Camera,
        color: 'text-purple-600', activeBg: 'bg-purple-600', activeText: 'text-white', hoverBg: 'hover:bg-purple-50' },
      { href: '/admin/media/seller', label: 'Önizleme İstasyonu', icon: Eye,
        color: 'text-purple-600', activeBg: 'bg-purple-600', activeText: 'text-white', hoverBg: 'hover:bg-purple-50' },
      { href: '/admin/media/pos', label: 'Foto/Video Satış', icon: CreditCard,
        color: 'text-purple-600', activeBg: 'bg-purple-600', activeText: 'text-white', hoverBg: 'hover:bg-purple-50' },
    ],
  },
  {
    title: 'SATIŞ',
    titleColor: 'text-orange-600',
    items: [
      { href: '/pos', label: 'POS Satış Ekranı', icon: ShoppingCart,
        color: 'text-orange-600', activeBg: 'bg-orange-500', activeText: 'text-white', hoverBg: 'hover:bg-orange-50' },
      { href: '/admin/products', label: 'Ürün Yönetimi', icon: Package,
        color: 'text-orange-600', activeBg: 'bg-orange-500', activeText: 'text-white', hoverBg: 'hover:bg-orange-50' },
      { href: '/admin/sales/unpaid', label: 'Ödenmemiş Satışlar', icon: CreditCard,
        color: 'text-orange-600', activeBg: 'bg-orange-500', activeText: 'text-white', hoverBg: 'hover:bg-orange-50' },
    ],
  },
  {
    title: 'RAPORLAR',
    titleColor: 'text-teal-600',
    items: [
      { href: '/admin/sales/daily', label: 'Kasa Raporu', icon: Calendar,
        color: 'text-teal-600', activeBg: 'bg-teal-600', activeText: 'text-white', hoverBg: 'hover:bg-teal-50' },
      { href: '/admin/reports/cashier', label: 'Vezne Raporu', icon: Receipt,
        color: 'text-teal-600', activeBg: 'bg-teal-600', activeText: 'text-white', hoverBg: 'hover:bg-teal-50' },
      { href: '/admin/reports/pilots', label: 'Pilot Raporu', icon: UserCog,
        color: 'text-teal-600', activeBg: 'bg-teal-600', activeText: 'text-white', hoverBg: 'hover:bg-teal-50' },
      { href: '/admin/reports/revenue', label: 'Gelir Raporu', icon: TrendingUp,
        color: 'text-teal-600', activeBg: 'bg-teal-600', activeText: 'text-white', hoverBg: 'hover:bg-teal-50' },
      { href: '/admin/reports/customers', label: 'Müşteri Akışı', icon: BarChart3,
        color: 'text-teal-600', activeBg: 'bg-teal-600', activeText: 'text-white', hoverBg: 'hover:bg-teal-50' },
      { href: '/admin/reports/compare', label: 'Dönem Karşılaştırma', icon: GitCompare,
        color: 'text-teal-600', activeBg: 'bg-teal-600', activeText: 'text-white', hoverBg: 'hover:bg-teal-50' },
    ],
  },
  {
    title: 'SİSTEM',
    titleColor: 'text-red-500',
    items: [
      { href: '/admin/notifications', label: 'Bildirimler', icon: Bell,
        color: 'text-red-500', activeBg: 'bg-red-500', activeText: 'text-white', hoverBg: 'hover:bg-red-50' },
      { href: '/admin/staff', label: 'Personel Yönetimi', icon: UserCog,
        color: 'text-red-500', activeBg: 'bg-red-500', activeText: 'text-white', hoverBg: 'hover:bg-red-50' },
      { href: '/admin/reports/system', label: 'Sistem İzleme', icon: Server,
        color: 'text-red-500', activeBg: 'bg-red-500', activeText: 'text-white', hoverBg: 'hover:bg-red-50' },
      { href: '/admin/settings', label: 'Ayarlar', icon: Settings,
        color: 'text-red-500', activeBg: 'bg-red-500', activeText: 'text-white', hoverBg: 'hover:bg-red-50' },
    ],
  },
]

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
        if (groupKey && permissions.groups && permissions.groups[groupKey] === false) {
          const hasEnabledItem = group.items.some(item => permissions.items[item.href] === true)
          if (!hasEnabledItem) return null
        }

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
    if (pathname === href) return true
    if (pathname.startsWith(href + '/')) {
      // Daha spesifik bir menü öğesi varsa onu tercih et
      const allHrefs = filteredGroups.flatMap(g => g.items.map(i => i.href))
      const hasBetterMatch = allHrefs.some(
        h => h !== href && h.length > href.length && (pathname === h || pathname.startsWith(h + '/'))
      )
      return !hasBetterMatch
    }
    return false
  }

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
        'h-[100dvh]',
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
          className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
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
              <div className="px-4 py-1.5">
                <span className={cn('text-[10px] font-bold tracking-wider', group.titleColor)}>
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
                          ? `${item.activeBg} ${item.activeText}`
                          : `text-gray-600 ${item.hoverBg} hover:text-gray-900`,
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className={cn(
                        'h-5 w-5 flex-shrink-0',
                        active ? item.activeText : item.color
                      )} />
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

      {/* Logout — pb-6 for Android/iOS safe area so it doesn't overlap back button */}
      <div className="p-2 pb-6 border-t border-gray-200" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
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
