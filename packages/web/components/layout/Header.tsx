'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Bell, Menu } from 'lucide-react'

interface User {
  id: string
  username: string
  role: string
  pilotName?: string
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: 'Yönetici',
      OFFICE_STAFF: 'Ofis Personeli',
      PILOT: 'Pilot',
      MEDIA_SELLER: 'Medya Satıcısı',
    }
    return labels[role] || role
  }

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="font-semibold text-gray-900">Hoş Geldiniz</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('tr-TR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </Button>

        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user ? getInitials(user.username) : '??'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user?.pilotName || user?.username}</p>
            <p className="text-xs text-muted-foreground">{user ? getRoleLabel(user.role) : ''}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
