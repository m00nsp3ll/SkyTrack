'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, BellOff, X, Smartphone, Check } from 'lucide-react'

interface PushNotificationManagerProps {
  onSubscribed?: () => void
  showOnMount?: boolean
}

export function PushNotificationManager({ onSubscribed, showOnMount = true }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking subscription:', err)
    }
  }, [])

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
    checkSubscription()
  }, [checkSubscription])

  useEffect(() => {
    // Always show modal if permission is default and not subscribed
    if (permission === 'default' && !isSubscribed) {
      setShowModal(true)
    }
  }, [permission, isSubscribed])

  const subscribe = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('[Push] Starting subscription...')

      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker desteklenmiyor')
      }

      if (!('PushManager' in window)) {
        throw new Error('Push bildirimleri desteklenmiyor')
      }

      // Request notification permission
      console.log('[Push] Requesting permission...')
      const perm = await Notification.requestPermission()
      console.log('[Push] Permission result:', perm)
      setPermission(perm)

      if (perm !== 'granted') {
        setError('Bildirim izni reddedildi')
        setLoading(false)
        return
      }

      // Get API base URL dynamically
      const protocol = window.location.protocol
      const hostname = window.location.hostname
      let apiUrl: string

      // If using custom domain, use api subdomain
      if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
        apiUrl = 'https://api.skytrackyp.com/api'
      }
      // If using Cloudflare tunnel, use api subdomain dynamically
      else if (hostname.includes('trycloudflare.com')) {
        apiUrl = `https://${hostname.replace(/^[^.]+/, 'api')}/api`
      }
      // Local network
      else {
        apiUrl = `${protocol}//${hostname}:3001/api`
      }
      console.log('[Push] API URL:', apiUrl)

      // Get VAPID public key from API
      console.log('[Push] Fetching VAPID key...')
      const vapidResponse = await fetch(`${apiUrl}/push/vapid-public-key`)
      const vapidData = await vapidResponse.json()
      console.log('[Push] VAPID response:', vapidData)

      if (!vapidData.success) {
        throw new Error('VAPID key alınamadı')
      }

      // Wait for service worker to be ready with timeout
      console.log('[Push] Waiting for Service Worker...')
      let registration: ServiceWorkerRegistration
      try {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Service Worker zaman aşımı')), 10000)
          )
        ])
        console.log('[Push] Service Worker ready:', registration)
      } catch (swError) {
        console.log('[Push] SW timeout, trying manual register...')
        // Try to register service worker manually
        registration = await navigator.serviceWorker.register('/sw.js')
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('[Push] Manual registration done:', registration)
      }

      // Subscribe to push notifications
      console.log('[Push] Subscribing to push manager...')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.data.publicKey),
      })
      console.log('[Push] Subscription created:', subscription)

      // Send subscription to backend
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiUrl}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
          },
          device: getDeviceInfo(),
        }),
      })

      if (!response.ok) {
        throw new Error('Abonelik kaydedilemedi')
      }

      setIsSubscribed(true)
      setShowModal(false)
      onSubscribed?.()
    } catch (err: any) {
      console.error('Push subscription error:', err)
      setError(err.message || 'Bildirim aboneliği başarısız')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Notify backend
        const token = localStorage.getItem('token')
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if push notifications not supported
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }

  // Permission denied banner
  if (permission === 'denied') {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex items-center">
          <BellOff className="h-5 w-5 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-700">
            Bildirimler kapalı. Müşteri atamalarını kaçırabilirsiniz.
            <br />
            <span className="text-xs">Tarayıcı ayarlarından bildirimleri açabilirsiniz.</span>
          </p>
        </div>
      </div>
    )
  }

  // Modal for requesting permission
  if (showModal && !isSubscribed) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary" />
                Bildirimleri Açın
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Müşteri atamaları ve uçuş bildirimleri almak için bildirimleri açmanız gerekiyor.
            </p>

            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Yeni müşteri atandığında anında bildirim
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Uygulama kapalıyken bile bildirim
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Günlük limit uyarıları
              </li>
            </ul>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <Button onClick={subscribe} disabled={loading} className="flex-1">
                {loading ? 'Açılıyor...' : 'Bildirimleri Aç'}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Sonra
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already subscribed - show small indicator or nothing
  if (isSubscribed) {
    return null
  }

  // Small banner to enable notifications
  if (permission === 'default' && !showModal) {
    return (
      <div
        className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <p className="text-sm text-blue-700 flex-1">
            Bildirimleri açarak müşteri atamalarından haberdar olun
          </p>
          <Button size="sm" variant="outline">
            Aç
          </Button>
        </div>
      </div>
    )
  }

  return null
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac/.test(ua)) return 'macOS'
  return 'Unknown'
}
