'use client'

import { useEffect, useState, useCallback } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Bell, Menu } from 'lucide-react'
import { currencyApi } from '@/lib/api'

interface User {
  id: string
  username: string
  role: string
  pilotName?: string
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<User | null>(null)
  const [rates, setRates] = useState<{ allRates: Record<string, { buyRate: number }>; lastUpdate: string } | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const fetchRates = useCallback(async () => {
    try {
      const res = await currencyApi.getRates()
      const data = res.data?.data
      if (data && data.rates) {
        setRates({
          allRates: data.rates,
          lastUpdate: data.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '',
        })
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchRates()
    const interval = setInterval(fetchRates, 60000)
    return () => clearInterval(interval)
  }, [fetchRates])

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
        {rates && rates.allRates && (
          <div className="hidden sm:flex items-center gap-1 ml-2">
            {rates.allRates.TRY && (
              <div className="flex items-center gap-1 bg-gray-50 border rounded-lg px-2 py-1">
                <span className="text-[10px] text-muted-foreground">₺</span>
                <span className="text-xs font-semibold text-gray-800">{rates.allRates.TRY.buyRate.toFixed(2)}</span>
              </div>
            )}
            {rates.allRates.USD && (
              <div className="flex items-center gap-1 bg-gray-50 border rounded-lg px-2 py-1">
                <span className="text-[10px] text-muted-foreground">$</span>
                <span className="text-xs font-semibold text-gray-800">{rates.allRates.USD.buyRate.toFixed(4)}</span>
              </div>
            )}
            {rates.allRates.GBP && (
              <div className="flex items-center gap-1 bg-gray-50 border rounded-lg px-2 py-1">
                <span className="text-[10px] text-muted-foreground">£</span>
                <span className="text-xs font-semibold text-gray-800">{rates.allRates.GBP.buyRate.toFixed(4)}</span>
              </div>
            )}
            {rates.allRates.RUB && (
              <div className="flex items-center gap-1 bg-gray-50 border rounded-lg px-2 py-1">
                <span className="text-[10px] text-muted-foreground">₽</span>
                <span className="text-xs font-semibold text-gray-800">{rates.allRates.RUB.buyRate.toFixed(2)}</span>
              </div>
            )}
            <span className="text-[9px] text-gray-400 ml-0.5">{rates.lastUpdate}</span>
          </div>
        )}
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
