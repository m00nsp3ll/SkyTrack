'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { Check, X, PenLine, Eraser, Printer, UserPlus } from 'lucide-react'
import { type Language, LANGUAGES, t, isRtl } from '@/lib/translations'

const KIOSK_EXIT_PIN = process.env.NEXT_PUBLIC_KIOSK_EXIT_PIN || '1903'
const LOGO_LONG_PRESS_MS = 5000

function getBaseUrl() {
  if (typeof window === 'undefined') return 'https://skytrackyp.com'
  const hostname = window.location.hostname
  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://skytrackyp.com'
  }
  return `https://${hostname}`
}

const ALL_COUNTRIES = [
  { code: '+90', flag: '🇹🇷', iso: 'TR' },
  { code: '+93', flag: '🇦🇫', iso: 'AF' },
  { code: '+355', flag: '🇦🇱', iso: 'AL' },
  { code: '+213', flag: '🇩🇿', iso: 'DZ' },
  { code: '+54', flag: '🇦🇷', iso: 'AR' },
  { code: '+374', flag: '🇦🇲', iso: 'AM' },
  { code: '+61', flag: '🇦🇺', iso: 'AU' },
  { code: '+43', flag: '🇦🇹', iso: 'AT' },
  { code: '+994', flag: '🇦🇿', iso: 'AZ' },
  { code: '+973', flag: '🇧🇭', iso: 'BH' },
  { code: '+880', flag: '🇧🇩', iso: 'BD' },
  { code: '+375', flag: '🇧🇾', iso: 'BY' },
  { code: '+32', flag: '🇧🇪', iso: 'BE' },
  { code: '+55', flag: '🇧🇷', iso: 'BR' },
  { code: '+359', flag: '🇧🇬', iso: 'BG' },
  { code: '+855', flag: '🇰🇭', iso: 'KH' },
  { code: '+237', flag: '🇨🇲', iso: 'CM' },
  { code: '+1', flag: '🇨🇦', iso: 'CA' },
  { code: '+56', flag: '🇨🇱', iso: 'CL' },
  { code: '+86', flag: '🇨🇳', iso: 'CN' },
  { code: '+57', flag: '🇨🇴', iso: 'CO' },
  { code: '+506', flag: '🇨🇷', iso: 'CR' },
  { code: '+385', flag: '🇭🇷', iso: 'HR' },
  { code: '+53', flag: '🇨🇺', iso: 'CU' },
  { code: '+357', flag: '🇨🇾', iso: 'CY' },
  { code: '+420', flag: '🇨🇿', iso: 'CZ' },
  { code: '+45', flag: '🇩🇰', iso: 'DK' },
  { code: '+593', flag: '🇪🇨', iso: 'EC' },
  { code: '+20', flag: '🇪🇬', iso: 'EG' },
  { code: '+372', flag: '🇪🇪', iso: 'EE' },
  { code: '+251', flag: '🇪🇹', iso: 'ET' },
  { code: '+358', flag: '🇫🇮', iso: 'FI' },
  { code: '+33', flag: '🇫🇷', iso: 'FR' },
  { code: '+995', flag: '🇬🇪', iso: 'GE' },
  { code: '+49', flag: '🇩🇪', iso: 'DE' },
  { code: '+233', flag: '🇬🇭', iso: 'GH' },
  { code: '+30', flag: '🇬🇷', iso: 'GR' },
  { code: '+502', flag: '🇬🇹', iso: 'GT' },
  { code: '+36', flag: '🇭🇺', iso: 'HU' },
  { code: '+91', flag: '🇮🇳', iso: 'IN' },
  { code: '+62', flag: '🇮🇩', iso: 'ID' },
  { code: '+98', flag: '🇮🇷', iso: 'IR' },
  { code: '+964', flag: '🇮🇶', iso: 'IQ' },
  { code: '+353', flag: '🇮🇪', iso: 'IE' },
  { code: '+972', flag: '🇮🇱', iso: 'IL' },
  { code: '+39', flag: '🇮🇹', iso: 'IT' },
  { code: '+81', flag: '🇯🇵', iso: 'JP' },
  { code: '+962', flag: '🇯🇴', iso: 'JO' },
  { code: '+7', flag: '🇰🇿', iso: 'KZ' },
  { code: '+254', flag: '🇰🇪', iso: 'KE' },
  { code: '+82', flag: '🇰🇷', iso: 'KR' },
  { code: '+965', flag: '🇰🇼', iso: 'KW' },
  { code: '+996', flag: '🇰🇬', iso: 'KG' },
  { code: '+371', flag: '🇱🇻', iso: 'LV' },
  { code: '+961', flag: '🇱🇧', iso: 'LB' },
  { code: '+370', flag: '🇱🇹', iso: 'LT' },
  { code: '+60', flag: '🇲🇾', iso: 'MY' },
  { code: '+960', flag: '🇲🇻', iso: 'MV' },
  { code: '+52', flag: '🇲🇽', iso: 'MX' },
  { code: '+373', flag: '🇲🇩', iso: 'MD' },
  { code: '+976', flag: '🇲🇳', iso: 'MN' },
  { code: '+212', flag: '🇲🇦', iso: 'MA' },
  { code: '+95', flag: '🇲🇲', iso: 'MM' },
  { code: '+977', flag: '🇳🇵', iso: 'NP' },
  { code: '+31', flag: '🇳🇱', iso: 'NL' },
  { code: '+64', flag: '🇳🇿', iso: 'NZ' },
  { code: '+234', flag: '🇳🇬', iso: 'NG' },
  { code: '+47', flag: '🇳🇴', iso: 'NO' },
  { code: '+968', flag: '🇴🇲', iso: 'OM' },
  { code: '+92', flag: '🇵🇰', iso: 'PK' },
  { code: '+507', flag: '🇵🇦', iso: 'PA' },
  { code: '+51', flag: '🇵🇪', iso: 'PE' },
  { code: '+63', flag: '🇵🇭', iso: 'PH' },
  { code: '+48', flag: '🇵🇱', iso: 'PL' },
  { code: '+351', flag: '🇵🇹', iso: 'PT' },
  { code: '+974', flag: '🇶🇦', iso: 'QA' },
  { code: '+40', flag: '🇷🇴', iso: 'RO' },
  { code: '+7', flag: '🇷🇺', iso: 'RU' },
  { code: '+250', flag: '🇷🇼', iso: 'RW' },
  { code: '+966', flag: '🇸🇦', iso: 'SA' },
  { code: '+381', flag: '🇷🇸', iso: 'RS' },
  { code: '+65', flag: '🇸🇬', iso: 'SG' },
  { code: '+421', flag: '🇸🇰', iso: 'SK' },
  { code: '+386', flag: '🇸🇮', iso: 'SI' },
  { code: '+27', flag: '🇿🇦', iso: 'ZA' },
  { code: '+34', flag: '🇪🇸', iso: 'ES' },
  { code: '+94', flag: '🇱🇰', iso: 'LK' },
  { code: '+46', flag: '🇸🇪', iso: 'SE' },
  { code: '+41', flag: '🇨🇭', iso: 'CH' },
  { code: '+963', flag: '🇸🇾', iso: 'SY' },
  { code: '+886', flag: '🇹🇼', iso: 'TW' },
  { code: '+992', flag: '🇹🇯', iso: 'TJ' },
  { code: '+255', flag: '🇹🇿', iso: 'TZ' },
  { code: '+66', flag: '🇹🇭', iso: 'TH' },
  { code: '+216', flag: '🇹🇳', iso: 'TN' },
  { code: '+993', flag: '🇹🇲', iso: 'TM' },
  { code: '+256', flag: '🇺🇬', iso: 'UG' },
  { code: '+380', flag: '🇺🇦', iso: 'UA' },
  { code: '+971', flag: '🇦🇪', iso: 'AE' },
  { code: '+44', flag: '🇬🇧', iso: 'GB' },
  { code: '+1', flag: '🇺🇸', iso: 'US' },
  { code: '+998', flag: '🇺🇿', iso: 'UZ' },
  { code: '+58', flag: '🇻🇪', iso: 'VE' },
  { code: '+84', flag: '🇻🇳', iso: 'VN' },
  { code: '+967', flag: '🇾🇪', iso: 'YE' },
]

const LANG_TO_LOCALE: Record<string, string> = {
  tr: 'tr', en: 'en', ru: 'ru', de: 'de', ar: 'ar',
  pl: 'pl', uk: 'uk', zh: 'zh', fr: 'fr', fa: 'fa',
}

interface RegistrationResult {
  customer: {
    id: string
    displayId: string
    firstName: string
    lastName: string
  }
  qrCode: string
  qrUrl: string
  pilotAssigned: boolean
  pilot: { id: string; name: string } | null
  message: string
}

// Auto-reset countdown in seconds after successful registration
const AUTO_RESET_SECONDS = 15

export default function KioskPage() {
  const [step, setStep] = useState<'language' | 'form' | 'waiver' | 'success'>('language')
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS)

  const router = useRouter()
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const countryDropdownRef = useRef<HTMLDivElement | null>(null)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [countryCode, setCountryCode] = useState('+90')
  const [showKvkkModal, setShowKvkkModal] = useState(false)

  const logoPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutPin, setLogoutPin] = useState('')
  const [logoutError, setLogoutError] = useState('')

  const startLogoPress = () => {
    if (logoPressTimerRef.current) clearTimeout(logoPressTimerRef.current)
    logoPressTimerRef.current = setTimeout(() => {
      setLogoutPin('')
      setLogoutError('')
      setShowLogoutModal(true)
    }, LOGO_LONG_PRESS_MS)
  }

  const cancelLogoPress = () => {
    if (logoPressTimerRef.current) {
      clearTimeout(logoPressTimerRef.current)
      logoPressTimerRef.current = null
    }
  }

  const handleLogoutSubmit = () => {
    if (logoutPin !== KIOSK_EXIT_PIN) {
      setLogoutError('Hatalı PIN')
      setLogoutPin('')
      return
    }
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } catch {}
    setShowLogoutModal(false)
    router.push('/login')
  }

  useEffect(() => () => cancelLogoPress(), [])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    emergencyContact: '',
    weight: '',
  })

  const lang = selectedLanguage || 'tr'
  const tr = t(lang)
  const rtl = isRtl(lang)

  const localizedCountries = useMemo(() => {
    const locale = LANG_TO_LOCALE[lang] || 'en'
    try {
      const regionNames = new Intl.DisplayNames([locale], { type: 'region' })
      return ALL_COUNTRIES.map(c => ({ ...c, name: regionNames.of(c.iso) || c.iso }))
    } catch {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
      return ALL_COUNTRIES.map(c => ({ ...c, name: regionNames.of(c.iso) || c.iso }))
    }
  }, [lang])

  const filteredCountries = localizedCountries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch)
  )

  // Close country dropdown on outside click
  useEffect(() => {
    if (!showCountryDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false)
        setCountrySearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCountryDropdown])

  // Resize signature canvas when waiver opens
  useEffect(() => {
    if (step === 'waiver' && signatureRef.current) {
      const timer = setTimeout(() => {
        const canvas = signatureRef.current?.getCanvas()
        if (canvas) {
          const parent = canvas.parentElement
          if (parent) {
            const rect = parent.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.fillStyle = 'white'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
            }
          }
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [step])

  // Auto-reset countdown after success
  useEffect(() => {
    if (step !== 'success') return
    setCountdown(AUTO_RESET_SECONDS)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          resetAll()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  const resetAll = () => {
    setStep('language')
    setSelectedLanguage(null)
    setResult(null)
    setError('')
    setCountryCode('+90')
    setCountrySearch('')
    setFormData({ firstName: '', lastName: '', phone: '', email: '', emergencyContact: '', weight: '' })
    signatureRef.current?.clear()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const openWaiver = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.weight) {
      setError(tr.fillNamePhone)
      return
    }
    setError('')
    setStep('waiver')
  }

  const handleSignatureConfirm = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) return
    const sigData = signatureRef.current.toDataURL('image/png')
    setStep('form') // go back to form visually while submitting
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/customers', {
        ...formData,
        phone: `${countryCode}${formData.phone}`,
        waiverSigned: true,
        signatureData: sigData,
        language: lang,
      })
      setResult(response.data.data)
      setStep('success')
      autoPrint(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || tr.registrationFailed)
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  // Tek bir iframe içinde iki sayfa (müşteri + pilot kopyası) print eder
  // iOS Safari popup blocker window.open'ı engellediği için iframe kullanılıyor
  const printBothCopies = (res: RegistrationResult) => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('tr-TR')
    const timeStr = now.toLocaleTimeString('tr-TR')

    const buildTicket = (copy: 'musteri' | 'pilot') => {
      const label = copy === 'musteri' ? 'MÜŞTERİ KOPYASI' : 'PİLOT KOPYASI'
      const labelClass = copy === 'musteri' ? 'label-musteri' : 'label-pilot'
      return `
        <div class="ticket">
          <div class="label ${labelClass}">${label}</div>
          <div><img src="${res.qrCode}" alt="QR" class="qr-code" /></div>
          <div class="display-id">${res.customer.displayId}</div>
          <div class="divider"></div>
          <div class="customer-name">${res.customer.firstName} ${res.customer.lastName}</div>
          ${res.pilot ? `<div class="pilot-name">Pilot: ${res.pilot.name}</div>` : ''}
          <div class="datetime">${dateStr} - ${timeStr}</div>
        </div>
      `
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Alanya Paragliding - ${res.customer.displayId}</title>
<style>
  @page { size: 7cm 9cm; margin: 0; }
  @media print { html, body { margin: 0; padding: 0; } }
  body { font-family: -apple-system, Arial, sans-serif; text-align: center; margin: 0; padding: 0; }
  .ticket { width: 7cm; box-sizing: border-box; padding: 8px; page-break-after: always; break-after: page; }
  .ticket:last-child { page-break-after: auto; break-after: auto; }
  .label { font-size: 9px; font-weight: bold; color: #fff; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px; }
  .label-musteri { background: #2563eb; }
  .label-pilot { background: #16a34a; }
  .qr-code { width: 4.5cm; height: 4.5cm; }
  .display-id { font-size: 16px; font-weight: bold; margin-top: 4px; letter-spacing: 1px; }
  .customer-name { font-size: 11px; color: #444; margin-top: 2px; }
  .pilot-name { font-size: 11px; font-weight: bold; color: #16a34a; margin-top: 3px; }
  .datetime { font-size: 9px; color: #888; margin-top: 4px; }
  .divider { border-top: 1px dashed #ccc; margin: 4px 0; }
</style>
</head>
<body>
${buildTicket('musteri')}
${buildTicket('pilot')}
</body>
</html>`

    // Önceki iframe'i temizle
    const existing = document.getElementById('print-frame')
    if (existing) existing.remove()

    const iframe = document.createElement('iframe')
    iframe.id = 'print-frame'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (err) {
        console.error('[Kiosk] Print hatası:', err)
      }
      // Print dialog kapatıldıktan sonra iframe'i temizle
      setTimeout(() => {
        try { iframe.remove() } catch {}
      }, 3000)
    }

    // QR image'ın yüklenmesini bekle (yoksa boş sayfa basar)
    const img = doc.querySelector('img')
    if (img && !img.complete) {
      img.addEventListener('load', () => setTimeout(triggerPrint, 150))
      img.addEventListener('error', () => setTimeout(triggerPrint, 150))
    } else {
      setTimeout(triggerPrint, 300)
    }
  }

  const handlePrint = () => {
    if (!result) return
    printBothCopies(result)
  }

  const autoPrint = (res: RegistrationResult) => {
    printBothCopies(res)
  }

  const getWaiverText = () => {
    return `${tr.waiverFullTitle}\n\n${tr.waiverIntro}\n\n${tr.waiverAccept}\n\n1. ${tr.waiverItem1}\n\n2. ${tr.waiverItem2}\n\n3. ${tr.waiverItem3}\n\n4. ${tr.waiverItem4}\n\n5. ${tr.waiverItem5}\n\n6. ${tr.waiverItem6}\n\n7. ${tr.waiverItem7}\n\n8. ${tr.waiverItem8}`
  }

  const logoutModal = showLogoutModal ? (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Kiosk Çıkışı</h2>
        <p className="text-sm text-gray-600 mb-4">Çıkmak için PIN giriniz.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={logoutPin}
          onChange={(e) => { setLogoutPin(e.target.value); setLogoutError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLogoutSubmit() }}
          className="w-full px-4 py-3 text-2xl text-center tracking-widest border-2 border-sky-200 rounded-xl focus:border-sky-500 outline-none"
          placeholder="••••"
        />
        {logoutError && <p className="text-red-600 text-sm mt-2 text-center">{logoutError}</p>}
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => { setShowLogoutModal(false); setLogoutPin(''); setLogoutError('') }}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            onClick={handleLogoutSubmit}
            className="flex-1 px-4 py-3 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700"
          >
            Çıkış
          </button>
        </div>
      </div>
    </div>
  ) : null

  // ==================== STEP: Language Selection ====================
  if (step === 'language') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-sky-50 to-blue-100">
        {logoutModal}
        <div className="mb-10 text-center">
          <img
            src="/skytrack-logo.png"
            alt="SkyTrack"
            className="w-28 h-28 mx-auto mb-5 rounded-3xl shadow-xl select-none"
            draggable={false}
            onTouchStart={startLogoPress}
            onTouchEnd={cancelLogoPress}
            onTouchCancel={cancelLogoPress}
            onMouseDown={startLogoPress}
            onMouseUp={cancelLogoPress}
            onMouseLeave={cancelLogoPress}
            onContextMenu={(e) => e.preventDefault()}
          />
          <h1 className="text-3xl font-bold text-sky-800 mb-2">SkyTrack</h1>
          <p className="text-lg text-sky-600">Hoş Geldiniz · Welcome · Добро пожаловать</p>
        </div>

        <div className="w-full max-w-lg grid grid-cols-2 gap-4">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setSelectedLanguage(l.code)
                setStep('form')
              }}
              className="flex items-center justify-center gap-3 px-5 py-5 bg-white border-2 border-sky-200 rounded-2xl text-xl font-semibold hover:border-sky-500 hover:bg-sky-50 active:scale-95 transition-all shadow-md min-h-[80px]"
            >
              <span className="text-3xl">{l.flag}</span>
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ==================== STEP: Waiver + Signature ====================
  if (step === 'waiver') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" dir={rtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex-shrink-0 bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{tr.waiverTitle}</h1>
          <button
            onClick={() => setStep('form')}
            className="p-2 rounded-full hover:bg-blue-700 transition-colors"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Customer Info Bar */}
        <div className="flex-shrink-0 bg-blue-50 px-6 py-3 text-base border-b text-blue-800">
          <span className="font-bold">{formData.firstName} {formData.lastName}</span>
          <span className="mx-3 text-blue-400">|</span>
          <span>{countryCode} {formData.phone}</span>
          <span className="mx-3 text-blue-400">|</span>
          <span>{new Date().toLocaleDateString('tr-TR')}</span>
        </div>

        {/* Scrollable Waiver Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 bg-gray-50 text-sm whitespace-pre-line leading-relaxed border-b">
            {getWaiverText()}
          </div>

          {/* KVKK */}
          <div className="px-6 py-4 bg-blue-50 border-b text-sm">
            {tr.waiverKvkkLine.split('{link}')[0]}
            <button
              type="button"
              onClick={() => setShowKvkkModal(true)}
              className="text-blue-600 underline font-medium hover:text-blue-800"
            >
              {tr.kvkkLinkText}
            </button>
            {tr.waiverKvkkLine.split('{link}')[1]}
          </div>

          {/* Signature */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xl font-bold">{tr.signHere}</p>
              <button
                type="button"
                onClick={() => signatureRef.current?.clear()}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
              >
                <Eraser className="w-4 h-4" />
                {tr.signClear}
              </button>
            </div>
            <div
              className="border-2 border-dashed border-gray-400 rounded-2xl bg-white overflow-hidden"
              style={{ height: '240px' }}
            >
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: 'touch-none',
                  style: { width: '100%', height: '100%', touchAction: 'none', display: 'block' }
                }}
                backgroundColor="white"
                penColor="black"
                minWidth={1.5}
                maxWidth={3}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">{tr.signHelper}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 bg-gray-100 border-t flex gap-4">
          <button
            onClick={() => setStep('form')}
            className="flex-1 h-16 text-lg font-semibold rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            {tr.signCancel}
          </button>
          <button
            onClick={handleSignatureConfirm}
            className="flex-1 h-16 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {tr.signConfirm}
          </button>
        </div>

        {/* KVKK Modal */}
        {showKvkkModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex-shrink-0 bg-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-xl font-bold">{tr.kvkkModalTitle}</h2>
                <button onClick={() => setShowKvkkModal(false)} className="p-1 rounded-full hover:bg-blue-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 text-sm whitespace-pre-line leading-relaxed">
                {tr.kvkkText}
              </div>
              <div className="flex-shrink-0 p-5 border-t">
                <button
                  onClick={() => setShowKvkkModal(false)}
                  className="w-full h-14 text-base font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  {tr.kvkkClose}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==================== STEP: Success ====================
  if (step === 'success' && result) {
    const now = new Date()
    const dateStr = now.toLocaleDateString('tr-TR')
    const timeStr = now.toLocaleTimeString('tr-TR')

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-50 to-emerald-100" dir={rtl ? 'rtl' : 'ltr'}>
        {/* Success Banner */}
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Green header */}
            <div className="bg-green-600 text-white px-8 py-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold">{tr.registrationSuccess}</h1>
              <p className="text-green-100 mt-1 text-sm">{result.message}</p>
            </div>

            {/* QR Code */}
            <div className="p-8 text-center">
              <div className="inline-block p-5 bg-white border-2 border-gray-100 rounded-2xl shadow-md">
                <img src={result.qrCode} alt="QR Code" className="w-52 h-52 mx-auto" />
                <p className="mt-3 text-2xl font-bold tracking-wide">{result.customer.displayId}</p>
                <p className="text-gray-600 text-lg">{result.customer.firstName} {result.customer.lastName}</p>
                <p className="text-sm text-gray-400 mt-1">{dateStr} · {timeStr}</p>
              </div>

              {result.pilot && (
                <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm text-gray-500">Atanan Pilot</p>
                  <p className="text-xl font-bold text-blue-700">{result.pilot.name}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-8 pb-8 space-y-3">
              <button
                onClick={handlePrint}
                className="w-full h-16 text-lg font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-3"
              >
                <Printer className="w-6 h-6" />
                {tr.printQR}
              </button>

              <button
                onClick={resetAll}
                className="w-full h-16 text-lg font-semibold rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 text-gray-700"
              >
                <UserPlus className="w-6 h-6" />
                {tr.newRegistration}
              </button>
            </div>
          </div>

          {/* Auto-reset countdown */}
          <p className="mt-5 text-center text-gray-500 text-sm">
            {countdown} saniye sonra otomatik sıfırlanacak
          </p>
        </div>
      </div>
    )
  }

  // ==================== STEP: Registration Form ====================
  return (
    <div className="min-h-screen overflow-y-auto" dir={rtl ? 'rtl' : 'ltr'}>
      {logoutModal}
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-sky-700 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <img
            src="/skytrack-logo.png"
            alt="SkyTrack"
            className="w-9 h-9 rounded-lg select-none"
            draggable={false}
            onTouchStart={startLogoPress}
            onTouchEnd={cancelLogoPress}
            onTouchCancel={cancelLogoPress}
            onMouseDown={startLogoPress}
            onMouseUp={cancelLogoPress}
            onMouseLeave={cancelLogoPress}
            onContextMenu={(e) => e.preventDefault()}
          />
          <span className="text-xl font-bold">{tr.formTitle}</span>
        </div>
        <button
          onClick={() => setStep('language')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-medium"
        >
          <span className="text-lg">{LANGUAGES.find(l => l.code === lang)?.flag}</span>
          <span>{LANGUAGES.find(l => l.code === lang)?.name}</span>
          <span className="text-sky-300 text-xs">▾</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-5 pb-10">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-xl font-bold text-gray-800">{tr.personalInfo}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-base font-medium">{tr.firstName} *</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder={tr.firstName}
                className="h-14 text-base rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-base font-medium">{tr.lastName} *</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder={tr.lastName}
                className="h-14 text-base rounded-xl"
                required
              />
            </div>
          </div>

          {/* Phone with country code */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base font-medium">{tr.phone} *</Label>
            <div className="flex gap-2">
              <div className="relative" ref={countryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(v => !v)}
                  className="flex h-14 items-center gap-2 rounded-xl border border-input bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500 whitespace-nowrap"
                >
                  {localizedCountries.find(c => c.code === countryCode)?.flag} {countryCode}
                  <span className="text-gray-400">▾</span>
                </button>
                {showCountryDropdown && (
                  <div className="absolute z-50 mt-1 w-80 rounded-xl border bg-white shadow-xl">
                    <div className="p-3 border-b">
                      <input
                        autoFocus
                        type="text"
                        value={countrySearch}
                        onChange={e => setCountrySearch(e.target.value)}
                        placeholder={tr.countrySearchPlaceholder}
                        className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <ul className="max-h-60 overflow-y-auto">
                      {filteredCountries.map((c, i) => (
                        <li
                          key={`${c.code}-${i}`}
                          onClick={() => {
                            setCountryCode(c.code)
                            setShowCountryDropdown(false)
                            setCountrySearch('')
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-sky-50"
                        >
                          <span className="text-xl">{c.flag}</span>
                          <span className="flex-1">{c.name}</span>
                          <span className="text-gray-400 text-xs">{c.code}</span>
                        </li>
                      ))}
                      {filteredCountries.length === 0 && (
                        <li className="px-4 py-3 text-sm text-gray-400">{tr.noResults}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="5XX XXX XX XX"
                required
                className="flex-1 h-14 text-base rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-medium">{tr.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ornek@email.com"
              className="h-14 text-base rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContact" className="text-base font-medium">{tr.emergencyContact}</Label>
            <Input
              id="emergencyContact"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              placeholder={tr.emergencyContact}
              className="h-14 text-base rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight" className="text-base font-medium">{tr.weight} *</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              min="20"
              max="150"
              value={formData.weight}
              onChange={handleChange}
              placeholder="70"
              required
              className="h-14 text-base rounded-xl"
            />
            <p className="text-sm text-gray-500">{tr.weightHelper}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-base">
            {error}
          </div>
        )}

        {/* Loading overlay message */}
        {loading && (
          <div className="p-4 bg-sky-50 border border-sky-200 text-sky-700 rounded-xl text-base text-center animate-pulse">
            {tr.saving}
          </div>
        )}

        {/* Sign & Submit Button */}
        <button
          onClick={openWaiver}
          disabled={loading}
          className="w-full h-20 text-xl font-bold rounded-2xl bg-green-600 hover:bg-green-700 active:scale-95 text-white flex items-center justify-center gap-4 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PenLine className="w-7 h-7" />
          {tr.signViewAndSign}
        </button>
      </div>
    </div>
  )
}
