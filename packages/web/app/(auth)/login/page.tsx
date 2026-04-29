'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Load saved credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem('savedCredentials')
    if (saved) {
      try {
        const { username: savedUser, password: savedPass } = JSON.parse(saved)
        setUsername(savedUser || '')
        setPassword(savedPass || '')
        setRememberMe(true)
      } catch {}
    }
  }, [])

  useEffect(() => {
    // Redirect www to non-www to keep localStorage consistent
    if (typeof window !== 'undefined' && window.location.hostname === 'www.skytrackyp.com') {
      window.location.href = window.location.href.replace('www.skytrackyp.com', 'skytrackyp.com')
      return
    }

    // If already logged in, redirect to appropriate page
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (token && user) {
      try {
        const userData = JSON.parse(user)
        // Token varsa direkt yönlendir — geçersizse hedef sayfa login'e atar
        if (userData.role === 'PILOT') {
          router.replace('/pilot')
        } else if (userData.role === 'KATLAMACI') {
          window.location.href = '/katlamaci'
        } else {
          router.replace('/admin')
        }
        return
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('permissions')
      }
    }

    setLoading(false)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authApi.login(username, password)
      const { token, user, permissions } = response.data.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      if (permissions) {
        localStorage.setItem('permissions', JSON.stringify(permissions))
      }

      // Save or clear credentials based on "Beni Hatırla"
      if (rememberMe) {
        localStorage.setItem('savedCredentials', JSON.stringify({ username, password }))
      } else {
        localStorage.removeItem('savedCredentials')
      }

      // Redirect based on role
      if (user.role === 'PILOT') {
        router.replace('/pilot')
      } else if (user.role === 'KATLAMACI') {
        window.location.href = '/katlamaci'
      } else {
        router.replace('/admin')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Giriş başarısız')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-pulse text-xl text-muted-foreground">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">SkyTrack</CardTitle>
          <CardDescription>Yamaç Paraşütü Yönetim Sistemi</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı girin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
                Beni Hatırla
              </Label>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
