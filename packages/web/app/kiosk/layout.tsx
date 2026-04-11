'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user)
    if (userData.role !== 'KIOSK') {
      router.push('/')
      return
    }

    setIsLoading(false)
  }, [router])

  // Kiosk boyunca iOS PWA status bar rengini gradient arka planla uyumlu yap
  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null
    const originalTheme = themeMeta?.getAttribute('content') || '#2563eb'
    const originalStatus = statusBarMeta?.getAttribute('content') || 'default'

    if (themeMeta) themeMeta.setAttribute('content', '#f0f9ff')
    if (statusBarMeta) statusBarMeta.setAttribute('content', 'black-translucent')

    return () => {
      if (themeMeta) themeMeta.setAttribute('content', originalTheme)
      if (statusBarMeta) statusBarMeta.setAttribute('content', originalStatus)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="animate-pulse text-xl text-sky-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      {children}
    </div>
  )
}
