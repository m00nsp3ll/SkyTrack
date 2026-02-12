'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { InAppNotificationBanner } from '@/components/native/InAppNotificationBanner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Redirect www to non-www to keep localStorage consistent
    if (typeof window !== 'undefined' && window.location.hostname === 'www.skytrackyp.com') {
      window.location.href = window.location.href.replace('www.skytrackyp.com', 'skytrackyp.com')
      return
    }

    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user)
    // ADMIN, OFFICE_STAFF, MEDIA_SELLER, CUSTOM can access dashboard
    const dashboardRoles = ['ADMIN', 'OFFICE_STAFF', 'MEDIA_SELLER', 'CUSTOM']
    if (!dashboardRoles.includes(userData.role)) {
      router.push('/pilot')
      return
    }

    // Load permissions from API if not cached
    const cachedPerms = localStorage.getItem('permissions')
    if (!cachedPerms && token) {
      import('@/lib/api').then(({ api }) => {
        api.get(`/users/permissions/${userData.role}`)
          .then(res => {
            if (res.data?.data?.permissions) {
              localStorage.setItem('permissions', JSON.stringify(res.data.data.permissions))
            }
          })
          .catch(() => {})
      })
    }

    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl text-muted-foreground">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* In-App Notification Banner (FCM native only) */}
      <InAppNotificationBanner />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 overflow-hidden">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
