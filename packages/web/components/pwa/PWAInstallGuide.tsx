'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Smartphone, X, Share, Plus, Check } from 'lucide-react'

interface PWAInstallPromptProps {
  onDismiss?: () => void
}

export function PWAInstallPrompt({ onDismiss }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Check if iOS
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    // Check if dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return // Don't show for 7 days after dismissal
    }

    // Listen for beforeinstallprompt (Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!standalone) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS, show manual instructions after delay
    if (ios && !standalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    setShowPrompt(false)
    onDismiss?.()
  }

  if (isStandalone || !showPrompt) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-primary" />
              SkyTrack'ı Telefonunuza Kurun
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isIOS ? (
            // iOS installation instructions
            <div className="space-y-4">
              <p className="text-muted-foreground">
                SkyTrack'ı ana ekranınıza ekleyerek uygulama gibi kullanın:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Paylaş butonuna tıklayın</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Safari'nin alt kısmındaki <Share className="h-4 w-4" /> simgesi
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Ana Ekrana Ekle'yi seçin</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Plus className="h-4 w-4" /> simgeli seçenek
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Ekle'ye tıklayın</p>
                    <p className="text-sm text-muted-foreground">
                      Uygulama ana ekranınıza eklenecek
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Android/Desktop installation
            <div className="space-y-4">
              <p className="text-muted-foreground">
                SkyTrack'ı yükleyerek daha hızlı erişin ve bildirimler alın.
              </p>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Tarayıcı olmadan açılır
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Daha hızlı yüklenir
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Anlık bildirimler alın
                </li>
              </ul>

              <Button onClick={handleInstall} className="w-full">
                <Smartphone className="h-4 w-4 mr-2" />
                Uygulamayı Kur
              </Button>
            </div>
          )}

          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            Daha Sonra
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
