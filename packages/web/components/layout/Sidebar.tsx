'use client'

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
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const menuItems = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/customers/new', label: 'Yeni Kayıt', icon: UserPlus },
  { href: '/admin/scan', label: 'QR Tara', icon: QrCode },
  { href: '/admin/customers', label: 'Müşteriler', icon: Users },
  { href: '/admin/pilots', label: 'Pilotlar', icon: UserCheck },
  { href: '/admin/flights', label: 'Canlı Takip', icon: Plane },
  { href: '/admin/flights/list', label: 'Uçuş Geçmişi', icon: Plane },
  { href: '/pos', label: 'POS Satış', icon: ShoppingCart },
  { href: '/admin/products', label: 'Ürün Kataloğu', icon: Package },
  { href: '/admin/sales/daily', label: 'Kasa Raporu', icon: Receipt },
  { href: '/admin/sales/unpaid', label: 'Ödenmemişler', icon: Receipt },
  { href: '/admin/media', label: 'Medya Yönetimi', icon: Camera },
  { href: '/admin/media/seller', label: 'Medya Satış', icon: Camera },
  { href: '/admin/reports', label: 'Raporlar', icon: BarChart3 },
  { href: '/admin/settings', label: 'Ayarlar', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">SkyTrack</h1>
        <p className="text-sm text-muted-foreground">Yönetim Paneli</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Çıkış Yap
        </Button>
      </div>
    </aside>
  )
}
