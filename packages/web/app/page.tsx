'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (token && user) {
      try {
        const userData = JSON.parse(user)
        if (userData.role === 'KATLAMACI') {
          window.location.replace('/katlamaci.html')
          return
        } else if (userData.role === 'PILOT') {
          router.replace('/pilot')
        } else {
          router.replace('/admin')
        }
        return
      } catch {}
    }

    router.replace('/login')
  }, [router])

  return <div className="min-h-screen" style={{ background: '#f1f5f9' }} />
}
