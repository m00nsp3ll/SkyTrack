'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plane, UserCheck, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todayCustomers: 0,
    activeFlights: 0,
    availablePilots: 0,
    todayRevenue: 0,
  })

  useEffect(() => {
    // TODO: Fetch actual stats from API
    setStats({
      todayCustomers: 12,
      activeFlights: 3,
      availablePilots: 5,
      todayRevenue: 15000,
    })
  }, [])

  const statCards = [
    {
      title: "Bugünkü Müşteriler",
      value: stats.todayCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: "Aktif Uçuşlar",
      value: stats.activeFlights,
      icon: Plane,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: "Müsait Pilotlar",
      value: stats.availablePilots,
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: "Günlük Gelir",
      value: `₺${stats.todayRevenue.toLocaleString('tr-TR')}`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yönetim Paneli</h1>
        <p className="text-muted-foreground">Günlük operasyon özeti</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Son Kayıtlar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Henüz müşteri kaydı yok. Yeni müşteri eklemek için "Müşteriler" sayfasına gidin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pilot Durumları</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Pilot durumlarını görmek için "Pilotlar" sayfasına gidin.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
