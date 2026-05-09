'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QrScannerProps {
  fps?: number
  qrbox?: number
  disableFlip?: boolean
  qrCodeSuccessCallback: (decodedText: string) => void
}

export default function QrScanner({
  fps = 5,
  qrbox = 200,
  disableFlip = false,
  qrCodeSuccessCallback,
}: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const callbackRef = useRef(qrCodeSuccessCallback)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const initRef = useRef(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('skytrack-camera') as 'environment' | 'user') || 'environment'
    }
    return 'environment'
  })

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = qrCodeSuccessCallback
  }, [qrCodeSuccessCallback])

  // Mark container as ready after mount
  useEffect(() => {
    setIsReady(true)
  }, [])

  const startWithMode = async (mode: 'environment' | 'user') => {
    const scannerId = 'qr-scanner-container'
    try {
      setIsLoading(true)
      setError(null)

      const element = document.getElementById(scannerId)
      if (!element) {
        setError('Scanner container bulunamadı.')
        setIsLoading(false)
        return
      }

      if (scannerRef.current) {
        try { await scannerRef.current.stop() } catch {}
        scannerRef.current = null
      }

      scannerRef.current = new Html5Qrcode(scannerId)

      await scannerRef.current.start(
        { facingMode: mode },
        { fps, qrbox: { width: qrbox, height: qrbox } },
        (decodedText) => { callbackRef.current(decodedText) },
        () => {}
      )
      setIsLoading(false)
    } catch (err: any) {
      console.error('QR Scanner error:', err)

      // Fallback: diğer kamerayı dene
      const fallback = mode === 'environment' ? 'user' : 'environment'
      try {
        if (!scannerRef.current) scannerRef.current = new Html5Qrcode(scannerId)
        await scannerRef.current.start(
          { facingMode: fallback },
          { fps, qrbox: { width: qrbox, height: qrbox } },
          (decodedText) => { callbackRef.current(decodedText) },
          () => {}
        )
        setFacingMode(fallback)
        localStorage.setItem('skytrack-camera', fallback)
        setIsLoading(false)
        return
      } catch (fallbackErr) {
        console.error('QR Scanner fallback error:', fallbackErr)
      }

      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
        setError('Kamera izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.')
      } else if (err?.name === 'NotFoundError') {
        setError('Kamera bulunamadı.')
      } else if (err?.name === 'NotSupportedError' || err?.message?.includes('secure') || err?.message?.includes('HTTPS')) {
        setError('HTTP üzerinden kamera erişimi engellendi.\n\nChrome: chrome://flags → "Insecure origins treated as secure" → Enabled')
      } else if (err?.name === 'NotReadableError') {
        setError('Kamera başka bir uygulama tarafından kullanılıyor.')
      } else {
        setError(`Kamera açılamadı: ${err?.message || 'Bilinmeyen hata'}`)
      }
      setIsLoading(false)
    }
  }

  // Start scanner after container is ready
  useEffect(() => {
    if (!isReady || initRef.current) return
    initRef.current = true
    startWithMode(facingMode)

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [isReady])

  const toggleCamera = async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newMode)
    localStorage.setItem('skytrack-camera', newMode)
    await startWithMode(newMode)
  }

  return (
    <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
      {/* Scanner container */}
      <div
        id="qr-scanner-container"
        className="w-full h-full absolute inset-0"
        style={{ minHeight: '300px' }}
      />

      {/* Camera toggle button */}
      {!error && !isLoading && (
        <button
          onClick={toggleCamera}
          className="absolute top-2 right-2 z-20 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition"
          title={facingMode === 'environment' ? 'Ön Kameraya Geç' : 'Arka Kameraya Geç'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
            <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
            <circle cx="12" cy="12" r="3" />
            <path d="m18 22-3-3 3-3" />
            <path d="m6 2 3 3-3 3" />
          </svg>
        </button>
      )}

      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg z-10">
          <div className="text-white text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm">Kamera açılıyor...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gray-900 rounded-lg z-10">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
