'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Search, X, QrCode } from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [manualId, setManualId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<any>(null)
  const videoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanner = async () => {
    setError('')
    setScanning(true)

    try {
      // Dynamically import html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode')

      if (videoRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader')

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            // Handle successful scan
            handleScanResult(decodedText)
          },
          () => {
            // Ignore errors during scanning
          }
        )
      }
    } catch (err: any) {
      setError('Kamera açılamadı. Lütfen kamera izinlerini kontrol edin.')
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (err) {
        // Ignore stop errors
      }
      scannerRef.current = null
    }
    setScanning(false)
  }

  const handleScanResult = (result: string) => {
    stopScanner()

    // Extract display ID from URL
    // Expected formats:
    // - http://192.168.1.11:3000/c/A0112
    // - http://192.168.1.11:3000/c/ST-20250207-001
    // - Just the ID: A0112 or ST-20250207-001

    let displayId = result.trim()

    // If it's a URL, extract the ID after /c/
    if (result.includes('/c/')) {
      displayId = result.split('/c/').pop()?.split('?')[0] || ''
    }

    // Clean up any trailing slashes or whitespace
    displayId = displayId.replace(/\/$/, '').trim()

    if (displayId) {
      router.push(`/admin/customers/${displayId}`)
    } else {
      setError('Geçersiz QR kod. Lütfen müşteri QR kodunu taratın.')
    }
  }

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualId.trim()) {
      router.push(`/admin/customers/${manualId.trim()}`)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QR Kod Tara</h1>
        <p className="text-muted-foreground">
          Müşteri QR kodunu taratın veya ID girin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Kamera ile Tara
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scanning ? (
            <div className="space-y-4">
              <div
                id="qr-reader"
                ref={videoRef}
                className="w-full aspect-square bg-black rounded-lg overflow-hidden"
              />
              <Button
                variant="destructive"
                className="w-full"
                onClick={stopScanner}
              >
                <X className="w-4 h-4 mr-2" />
                Taramayı Durdur
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={startScanner}
            >
              <QrCode className="w-5 h-5 mr-2" />
              Kamerayı Aç
            </Button>
          )}

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Manuel ID Girişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <Input
              placeholder="Örn: ST-20250207-001"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className="font-mono"
            />
            <Button type="submit" disabled={!manualId.trim()}>
              Ara
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
