'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { ArrowLeft, UserPlus, Printer, Eraser, Check, X, PenLine } from 'lucide-react'
import Link from 'next/link'
import { type Language, LANGUAGES, t, isRtl } from '@/lib/translations'

// Dynamic base URL for customer pages
function getBaseUrl() {
  if (typeof window === 'undefined') return 'https://skytrackyp.com'
  const hostname = window.location.hostname
  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://skytrackyp.com'
  }
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname}`
  }
  return `https://${hostname}:${window.location.port || '3000'}`
}

const WELCOME_MESSAGES = [
  'Hoş Geldiniz! Lütfen dilinizi seçin.',
  'Welcome! Please select your language.',
  'Добро пожаловать! Пожалуйста, выберите язык.',
  'Willkommen! Bitte wählen Sie Ihre Sprache.',
  'مرحباً! يرجى اختيار لغتك.',
  'Witamy! Proszę wybrać język.',
  'Ласкаво просимо! Будь ласка, оберіть мову.',
  '欢迎！请选择您的语言。',
  'Bienvenue ! Veuillez sélectionner votre langue.',
  '!خوش آمدید! لطفاً زبان خود را انتخاب کنید',
]

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
  suggestedPilot: { id: string; name: string } | null
  message: string
}

// Country data with ISO 3166-1 alpha-2 codes for Intl.DisplayNames localization
const ALL_COUNTRIES = [
  { code: '+90', flag: '🇹🇷', iso: 'TR' },
  { code: '+93', flag: '🇦🇫', iso: 'AF' },
  { code: '+355', flag: '🇦🇱', iso: 'AL' },
  { code: '+213', flag: '🇩🇿', iso: 'DZ' },
  { code: '+376', flag: '🇦🇩', iso: 'AD' },
  { code: '+244', flag: '🇦🇴', iso: 'AO' },
  { code: '+54', flag: '🇦🇷', iso: 'AR' },
  { code: '+374', flag: '🇦🇲', iso: 'AM' },
  { code: '+61', flag: '🇦🇺', iso: 'AU' },
  { code: '+43', flag: '🇦🇹', iso: 'AT' },
  { code: '+994', flag: '🇦🇿', iso: 'AZ' },
  { code: '+1-242', flag: '🇧🇸', iso: 'BS' },
  { code: '+973', flag: '🇧🇭', iso: 'BH' },
  { code: '+880', flag: '🇧🇩', iso: 'BD' },
  { code: '+375', flag: '🇧🇾', iso: 'BY' },
  { code: '+32', flag: '🇧🇪', iso: 'BE' },
  { code: '+501', flag: '🇧🇿', iso: 'BZ' },
  { code: '+229', flag: '🇧🇯', iso: 'BJ' },
  { code: '+975', flag: '🇧🇹', iso: 'BT' },
  { code: '+591', flag: '🇧🇴', iso: 'BO' },
  { code: '+387', flag: '🇧🇦', iso: 'BA' },
  { code: '+267', flag: '🇧🇼', iso: 'BW' },
  { code: '+55', flag: '🇧🇷', iso: 'BR' },
  { code: '+673', flag: '🇧🇳', iso: 'BN' },
  { code: '+359', flag: '🇧🇬', iso: 'BG' },
  { code: '+226', flag: '🇧🇫', iso: 'BF' },
  { code: '+257', flag: '🇧🇮', iso: 'BI' },
  { code: '+855', flag: '🇰🇭', iso: 'KH' },
  { code: '+237', flag: '🇨🇲', iso: 'CM' },
  { code: '+1', flag: '🇨🇦', iso: 'CA' },
  { code: '+238', flag: '🇨🇻', iso: 'CV' },
  { code: '+236', flag: '🇨🇫', iso: 'CF' },
  { code: '+235', flag: '🇹🇩', iso: 'TD' },
  { code: '+56', flag: '🇨🇱', iso: 'CL' },
  { code: '+86', flag: '🇨🇳', iso: 'CN' },
  { code: '+57', flag: '🇨🇴', iso: 'CO' },
  { code: '+269', flag: '🇰🇲', iso: 'KM' },
  { code: '+243', flag: '🇨🇩', iso: 'CD' },
  { code: '+242', flag: '🇨🇬', iso: 'CG' },
  { code: '+506', flag: '🇨🇷', iso: 'CR' },
  { code: '+385', flag: '🇭🇷', iso: 'HR' },
  { code: '+53', flag: '🇨🇺', iso: 'CU' },
  { code: '+357', flag: '🇨🇾', iso: 'CY' },
  { code: '+420', flag: '🇨🇿', iso: 'CZ' },
  { code: '+45', flag: '🇩🇰', iso: 'DK' },
  { code: '+253', flag: '🇩🇯', iso: 'DJ' },
  { code: '+1-809', flag: '🇩🇴', iso: 'DO' },
  { code: '+593', flag: '🇪🇨', iso: 'EC' },
  { code: '+20', flag: '🇪🇬', iso: 'EG' },
  { code: '+503', flag: '🇸🇻', iso: 'SV' },
  { code: '+240', flag: '🇬🇶', iso: 'GQ' },
  { code: '+291', flag: '🇪🇷', iso: 'ER' },
  { code: '+372', flag: '🇪🇪', iso: 'EE' },
  { code: '+268', flag: '🇸🇿', iso: 'SZ' },
  { code: '+251', flag: '🇪🇹', iso: 'ET' },
  { code: '+679', flag: '🇫🇯', iso: 'FJ' },
  { code: '+358', flag: '🇫🇮', iso: 'FI' },
  { code: '+33', flag: '🇫🇷', iso: 'FR' },
  { code: '+241', flag: '🇬🇦', iso: 'GA' },
  { code: '+220', flag: '🇬🇲', iso: 'GM' },
  { code: '+995', flag: '🇬🇪', iso: 'GE' },
  { code: '+49', flag: '🇩🇪', iso: 'DE' },
  { code: '+233', flag: '🇬🇭', iso: 'GH' },
  { code: '+30', flag: '🇬🇷', iso: 'GR' },
  { code: '+502', flag: '🇬🇹', iso: 'GT' },
  { code: '+224', flag: '🇬🇳', iso: 'GN' },
  { code: '+245', flag: '🇬🇼', iso: 'GW' },
  { code: '+592', flag: '🇬🇾', iso: 'GY' },
  { code: '+509', flag: '🇭🇹', iso: 'HT' },
  { code: '+504', flag: '🇭🇳', iso: 'HN' },
  { code: '+36', flag: '🇭🇺', iso: 'HU' },
  { code: '+354', flag: '🇮🇸', iso: 'IS' },
  { code: '+91', flag: '🇮🇳', iso: 'IN' },
  { code: '+62', flag: '🇮🇩', iso: 'ID' },
  { code: '+98', flag: '🇮🇷', iso: 'IR' },
  { code: '+964', flag: '🇮🇶', iso: 'IQ' },
  { code: '+353', flag: '🇮🇪', iso: 'IE' },
  { code: '+972', flag: '🇮🇱', iso: 'IL' },
  { code: '+39', flag: '🇮🇹', iso: 'IT' },
  { code: '+1-876', flag: '🇯🇲', iso: 'JM' },
  { code: '+81', flag: '🇯🇵', iso: 'JP' },
  { code: '+962', flag: '🇯🇴', iso: 'JO' },
  { code: '+7', flag: '🇰🇿', iso: 'KZ' },
  { code: '+254', flag: '🇰🇪', iso: 'KE' },
  { code: '+686', flag: '🇰🇮', iso: 'KI' },
  { code: '+850', flag: '🇰🇵', iso: 'KP' },
  { code: '+82', flag: '🇰🇷', iso: 'KR' },
  { code: '+965', flag: '🇰🇼', iso: 'KW' },
  { code: '+996', flag: '🇰🇬', iso: 'KG' },
  { code: '+856', flag: '🇱🇦', iso: 'LA' },
  { code: '+371', flag: '🇱🇻', iso: 'LV' },
  { code: '+961', flag: '🇱🇧', iso: 'LB' },
  { code: '+266', flag: '🇱🇸', iso: 'LS' },
  { code: '+231', flag: '🇱🇷', iso: 'LR' },
  { code: '+218', flag: '🇱🇾', iso: 'LY' },
  { code: '+423', flag: '🇱🇮', iso: 'LI' },
  { code: '+370', flag: '🇱🇹', iso: 'LT' },
  { code: '+352', flag: '🇱🇺', iso: 'LU' },
  { code: '+261', flag: '🇲🇬', iso: 'MG' },
  { code: '+265', flag: '🇲🇼', iso: 'MW' },
  { code: '+60', flag: '🇲🇾', iso: 'MY' },
  { code: '+960', flag: '🇲🇻', iso: 'MV' },
  { code: '+223', flag: '🇲🇱', iso: 'ML' },
  { code: '+356', flag: '🇲🇹', iso: 'MT' },
  { code: '+222', flag: '🇲🇷', iso: 'MR' },
  { code: '+230', flag: '🇲🇺', iso: 'MU' },
  { code: '+52', flag: '🇲🇽', iso: 'MX' },
  { code: '+373', flag: '🇲🇩', iso: 'MD' },
  { code: '+377', flag: '🇲🇨', iso: 'MC' },
  { code: '+976', flag: '🇲🇳', iso: 'MN' },
  { code: '+382', flag: '🇲🇪', iso: 'ME' },
  { code: '+212', flag: '🇲🇦', iso: 'MA' },
  { code: '+258', flag: '🇲🇿', iso: 'MZ' },
  { code: '+95', flag: '🇲🇲', iso: 'MM' },
  { code: '+264', flag: '🇳🇦', iso: 'NA' },
  { code: '+977', flag: '🇳🇵', iso: 'NP' },
  { code: '+31', flag: '🇳🇱', iso: 'NL' },
  { code: '+64', flag: '🇳🇿', iso: 'NZ' },
  { code: '+505', flag: '🇳🇮', iso: 'NI' },
  { code: '+227', flag: '🇳🇪', iso: 'NE' },
  { code: '+234', flag: '🇳🇬', iso: 'NG' },
  { code: '+389', flag: '🇲🇰', iso: 'MK' },
  { code: '+47', flag: '🇳🇴', iso: 'NO' },
  { code: '+968', flag: '🇴🇲', iso: 'OM' },
  { code: '+92', flag: '🇵🇰', iso: 'PK' },
  { code: '+507', flag: '🇵🇦', iso: 'PA' },
  { code: '+675', flag: '🇵🇬', iso: 'PG' },
  { code: '+595', flag: '🇵🇾', iso: 'PY' },
  { code: '+51', flag: '🇵🇪', iso: 'PE' },
  { code: '+63', flag: '🇵🇭', iso: 'PH' },
  { code: '+48', flag: '🇵🇱', iso: 'PL' },
  { code: '+351', flag: '🇵🇹', iso: 'PT' },
  { code: '+974', flag: '🇶🇦', iso: 'QA' },
  { code: '+40', flag: '🇷🇴', iso: 'RO' },
  { code: '+7', flag: '🇷🇺', iso: 'RU' },
  { code: '+250', flag: '🇷🇼', iso: 'RW' },
  { code: '+966', flag: '🇸🇦', iso: 'SA' },
  { code: '+221', flag: '🇸🇳', iso: 'SN' },
  { code: '+381', flag: '🇷🇸', iso: 'RS' },
  { code: '+232', flag: '🇸🇱', iso: 'SL' },
  { code: '+65', flag: '🇸🇬', iso: 'SG' },
  { code: '+421', flag: '🇸🇰', iso: 'SK' },
  { code: '+386', flag: '🇸🇮', iso: 'SI' },
  { code: '+252', flag: '🇸🇴', iso: 'SO' },
  { code: '+27', flag: '🇿🇦', iso: 'ZA' },
  { code: '+211', flag: '🇸🇸', iso: 'SS' },
  { code: '+34', flag: '🇪🇸', iso: 'ES' },
  { code: '+94', flag: '🇱🇰', iso: 'LK' },
  { code: '+249', flag: '🇸🇩', iso: 'SD' },
  { code: '+597', flag: '🇸🇷', iso: 'SR' },
  { code: '+46', flag: '🇸🇪', iso: 'SE' },
  { code: '+41', flag: '🇨🇭', iso: 'CH' },
  { code: '+963', flag: '🇸🇾', iso: 'SY' },
  { code: '+886', flag: '🇹🇼', iso: 'TW' },
  { code: '+992', flag: '🇹🇯', iso: 'TJ' },
  { code: '+255', flag: '🇹🇿', iso: 'TZ' },
  { code: '+66', flag: '🇹🇭', iso: 'TH' },
  { code: '+228', flag: '🇹🇬', iso: 'TG' },
  { code: '+676', flag: '🇹🇴', iso: 'TO' },
  { code: '+1-868', flag: '🇹🇹', iso: 'TT' },
  { code: '+216', flag: '🇹🇳', iso: 'TN' },
  { code: '+993', flag: '🇹🇲', iso: 'TM' },
  { code: '+256', flag: '🇺🇬', iso: 'UG' },
  { code: '+380', flag: '🇺🇦', iso: 'UA' },
  { code: '+971', flag: '🇦🇪', iso: 'AE' },
  { code: '+44', flag: '🇬🇧', iso: 'GB' },
  { code: '+1', flag: '🇺🇸', iso: 'US' },
  { code: '+598', flag: '🇺🇾', iso: 'UY' },
  { code: '+998', flag: '🇺🇿', iso: 'UZ' },
  { code: '+678', flag: '🇻🇺', iso: 'VU' },
  { code: '+58', flag: '🇻🇪', iso: 'VE' },
  { code: '+84', flag: '🇻🇳', iso: 'VN' },
  { code: '+967', flag: '🇾🇪', iso: 'YE' },
  { code: '+260', flag: '🇿🇲', iso: 'ZM' },
  { code: '+263', flag: '🇿🇼', iso: 'ZW' },
]

// Language code mapping for Intl.DisplayNames
const LANG_TO_LOCALE: Record<string, string> = {
  tr: 'tr', en: 'en', ru: 'ru', de: 'de', ar: 'ar',
  pl: 'pl', uk: 'uk', zh: 'zh', fr: 'fr', fa: 'fa',
}

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const countryDropdownRef = useRef<HTMLDivElement | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const [showKvkkModal, setShowKvkkModal] = useState(false)
  const [showPilotSelect, setShowPilotSelect] = useState(false)
  const [availablePilots, setAvailablePilots] = useState<{ id: string; name: string; queuePosition: number; roundCount: number }[]>([])
  const [confirmingPilot, setConfirmingPilot] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)

  const [countryCode, setCountryCode] = useState('+90')
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
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

  // Localize country names based on selected language
  const localizedCountries = useMemo(() => {
    const locale = LANG_TO_LOCALE[lang] || 'en'
    try {
      const regionNames = new Intl.DisplayNames([locale], { type: 'region' })
      return ALL_COUNTRIES.map(c => ({
        ...c,
        name: regionNames.of(c.iso) || c.iso,
      }))
    } catch {
      // Fallback: use English
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
      return ALL_COUNTRIES.map(c => ({
        ...c,
        name: regionNames.of(c.iso) || c.iso,
      }))
    }
  }, [lang])

  const filteredCountries = localizedCountries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch)
  )

  // Close country dropdown when clicking outside
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

  // Handle canvas resize for fullscreen modal
  useEffect(() => {
    if (showWaiverModal && signatureRef.current) {
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
  }, [showWaiverModal])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
  }

  const submitRegistration = async (sigData: string) => {
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
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.response?.data?.error?.message || tr.registrationFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleSignatureConfirm = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const data = signatureRef.current.toDataURL('image/png')
      setSignatureData(data)
      setShowWaiverModal(false)
      submitRegistration(data)
    }
  }

  const handleSignatureCancel = () => {
    setShowWaiverModal(false)
    signatureRef.current?.clear()
  }

  const openWaiverModal = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError(tr.fillNamePhone)
      return
    }
    setError('')
    setShowWaiverModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!signatureData) {
      setError(tr.signRequired)
      return
    }
    await submitRegistration(signatureData)
  }

  const confirmPilot = async (pilotId?: string) => {
    if (!result) return
    setConfirmingPilot(true)
    try {
      const response = await api.post(`/customers/${result.customer.id}/confirm-pilot`, {
        pilotId: pilotId || undefined,
      })
      setResult({
        ...result,
        pilotAssigned: true,
        pilot: response.data.data.pilot,
        suggestedPilot: null,
      })
      setShowPilotSelect(false)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Pilot atama hatası')
    } finally {
      setConfirmingPilot(false)
    }
  }

  const forfeitPilot = async () => {
    if (!result) return
    setConfirmingPilot(true)
    try {
      const response = await api.post(`/customers/${result.customer.id}/forfeit-pilot`)
      const newSuggested = response.data.data.suggestedPilot
      setResult({
        ...result,
        suggestedPilot: newSuggested,
      })
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Feragat hatası')
    } finally {
      setConfirmingPilot(false)
    }
  }

  const loadAvailablePilots = async () => {
    try {
      const response = await api.get('/pilots/queue')
      const pilots = response.data.data.queue.filter(
        (p: any) => p.status === 'AVAILABLE' && p.inQueue !== false && p.dailyFlightCount < p.maxDailyFlights
      )
      setAvailablePilots(pilots)
      setShowPilotSelect(true)
    } catch (err) {
      console.error('Pilot listesi alınamadı:', err)
    }
  }

  const handlePrint = () => {
    if (!result) return
    const token = localStorage.getItem('token') || ''
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/customers/${result.customer.id}/label?token=${token}`, '_blank')
  }

  const resetForm = () => {
    setResult(null)
    setSignatureData(null)
    setSelectedLanguage(null)
    setCountryCode('+90')
    setCountrySearch('')
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      emergencyContact: '',
      weight: '',
    })
  }

  // Build waiver text from translations
  const getWaiverText = () => {
    return `${tr.waiverFullTitle}\n\n${tr.waiverIntro}\n\n${tr.waiverAccept}\n\n1. ${tr.waiverItem1}\n\n2. ${tr.waiverItem2}\n\n3. ${tr.waiverItem3}\n\n4. ${tr.waiverItem4}\n\n5. ${tr.waiverItem5}\n\n6. ${tr.waiverItem6}\n\n7. ${tr.waiverItem7}\n\n8. ${tr.waiverItem8}`
  }

  // ==================== STEP 1: Language Selection ====================
  if (!selectedLanguage) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img
            src="/skytrack-logo.png"
            alt="SkyTrack"
            className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg"
          />
          <p className="text-lg text-gray-600">Welcome! Please select your language.</p>
        </div>

        {/* Language buttons grid */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelectedLanguage(l.code)}
              className="flex items-center justify-center gap-3 px-4 py-4 bg-white border-2 border-gray-200 rounded-xl text-lg font-medium hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all min-h-[60px] shadow-sm"
            >
              <span className="text-2xl">{l.flag}</span>
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ==================== Waiver Modal (Fullscreen) ====================
  if (showWaiverModal) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" dir={rtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex-shrink-0 bg-blue-600 text-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{tr.waiverTitle}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignatureCancel}
            className="text-white hover:bg-blue-700"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Customer Info */}
        <div className="flex-shrink-0 bg-blue-50 px-4 py-2 text-sm">
          <span className="font-semibold">{formData.firstName} {formData.lastName}</span>
          <span className="mx-2">|</span>
          <span>{formData.phone}</span>
          <span className="mx-2">|</span>
          <span>{new Date().toLocaleDateString('tr-TR')}</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Waiver Text */}
          <div className="p-4 bg-gray-50 text-sm whitespace-pre-line border-b">
            {getWaiverText()}
          </div>

          {/* KVKK Consent Line */}
          <div className="px-4 py-3 bg-blue-50 border-b text-sm">
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

          {/* Signature Area */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-lg font-semibold">{tr.signHere}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
              >
                <Eraser className="w-4 h-4 mr-1" />
                {tr.signClear}
              </Button>
            </div>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden"
              style={{ height: '200px' }}
            >
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: 'touch-none',
                  style: {
                    width: '100%',
                    height: '100%',
                    touchAction: 'none',
                    display: 'block'
                  }
                }}
                backgroundColor="white"
                penColor="black"
                minWidth={1}
                maxWidth={2.5}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {tr.signHelper}
            </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex-shrink-0 p-4 bg-gray-100 border-t flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 text-base"
            onClick={handleSignatureCancel}
          >
            <X className="w-5 h-5 mr-2" />
            {tr.signCancel}
          </Button>
          <Button
            className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700"
            onClick={handleSignatureConfirm}
          >
            <Check className="w-5 h-5 mr-2" />
            {tr.signConfirm}
          </Button>
        </div>

        {/* KVKK Modal - overlay inside waiver modal */}
        {showKvkkModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="flex-shrink-0 bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                <h2 className="text-lg font-bold">{tr.kvkkModalTitle}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKvkkModal(false)}
                  className="text-white hover:bg-blue-700"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-sm whitespace-pre-line">
                {tr.kvkkText}
              </div>
              <div className="flex-shrink-0 p-4 border-t">
                <Button
                  className="w-full"
                  onClick={() => setShowKvkkModal(false)}
                >
                  {tr.kvkkClose}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==================== Success State ====================
  if (result) {
    const now = new Date()
    const dateStr = now.toLocaleDateString('tr-TR')
    const timeStr = now.toLocaleTimeString('tr-TR')

    return (
      <div className="max-w-lg mx-auto space-y-6" dir={rtl ? 'rtl' : 'ltr'}>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CardTitle className="text-green-700">{tr.registrationSuccess}</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                <img
                  src={result.qrCode}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto"
                />
                <p className="mt-2 text-xl font-bold">{result.customer.displayId}</p>
                <p className="text-gray-600">
                  {result.customer.firstName} {result.customer.lastName}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {dateStr} - {timeStr}
                </p>
              </div>
            </div>

            {/* Pilot onaylanmış */}
            {result.pilotAssigned && result.pilot && (
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Atanan Pilot</p>
                <p className="text-lg font-semibold text-green-700">{result.pilot.name}</p>
              </div>
            )}

            {/* Pilot onay bekliyor */}
            {!result.pilotAssigned && result.suggestedPilot && !showPilotSelect && (
              <div className="space-y-3">
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-300">
                  <p className="text-sm text-gray-600">Önerilen Pilot</p>
                  <p className="text-xl font-bold text-yellow-700">{result.suggestedPilot.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Onay bekleniyor...</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => confirmPilot()}
                    disabled={confirmingPilot}
                    className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700"
                  >
                    {confirmingPilot ? 'Atanıyor...' : 'Onayla'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={forfeitPilot}
                    disabled={confirmingPilot}
                    className="flex-1 h-12 text-base border-red-400 text-red-600 hover:bg-red-50"
                  >
                    Feragat et
                  </Button>
                  <Button
                    variant="outline"
                    onClick={loadAvailablePilots}
                    className="flex-1 h-12 text-base border-orange-400 text-orange-600 hover:bg-orange-50"
                  >
                    Pilot Değiştir
                  </Button>
                </div>
              </div>
            )}

            {/* Pilot seçim listesi */}
            {showPilotSelect && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Pilot Seçin:</p>
                <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                  {availablePilots.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => confirmPilot(p.id)}
                      disabled={confirmingPilot}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-400">Sıra: {p.queuePosition}</span>
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPilotSelect(false)}
                  className="w-full"
                >
                  İptal
                </Button>
              </div>
            )}

            {/* Müsait pilot yok */}
            {!result.pilotAssigned && !result.suggestedPilot && (
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600">Müsait pilot bulunamadı</p>
              </div>
            )}

            <Button onClick={handlePrint} className="w-full h-12 text-base">
              <Printer className="w-5 h-5 mr-2" />
              {tr.printQR}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={resetForm}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {tr.newRegistration}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==================== Registration Form ====================
  return (
    <div className="max-w-2xl mx-auto space-y-6" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setSelectedLanguage(null)}>
          <ArrowLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{tr.formTitle}</h1>
          <p className="text-muted-foreground">{tr.personalInfo}</p>
        </div>
        {/* Language indicator */}
        <button
          onClick={() => setSelectedLanguage(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm hover:bg-gray-50"
        >
          <span>{LANGUAGES.find(l => l.code === lang)?.flag}</span>
          <span>{LANGUAGES.find(l => l.code === lang)?.name}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{tr.personalInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{tr.firstName} *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder={tr.firstName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{tr.lastName} *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder={tr.lastName}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{tr.phone} *</Label>
              <div className="flex gap-2">
                <div className="relative" ref={countryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(v => !v)}
                    className="flex h-10 items-center gap-1 rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap"
                  >
                    {localizedCountries.find(c => c.code === countryCode)?.flag} {countryCode}
                    <span className="ml-1 text-muted-foreground">▾</span>
                  </button>
                  {showCountryDropdown && (
                    <div className="absolute z-50 mt-1 w-72 rounded-md border bg-white shadow-lg">
                      <div className="p-2 border-b">
                        <input
                          autoFocus
                          type="text"
                          value={countrySearch}
                          onChange={e => setCountrySearch(e.target.value)}
                          placeholder={tr.countrySearchPlaceholder}
                          className="w-full rounded border border-input px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <ul className="max-h-56 overflow-y-auto">
                        {filteredCountries.map((c, i) => (
                          <li
                            key={`${c.code}-${i}`}
                            onClick={() => {
                              setCountryCode(c.code)
                              setShowCountryDropdown(false)
                              setCountrySearch('')
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                          >
                            <span>{c.flag}</span>
                            <span className="flex-1">{c.name}</span>
                            <span className="text-muted-foreground">{c.code}</span>
                          </li>
                        ))}
                        {filteredCountries.length === 0 && (
                          <li className="px-3 py-2 text-sm text-muted-foreground">{tr.noResults}</li>
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
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{tr.email} *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ornek@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContact">{tr.emergencyContact}</Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder={tr.emergencyContact}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">{tr.weight} *</Label>
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
              />
              <p className="text-xs text-muted-foreground">
                {tr.weightHelper}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tr.waiverTitle}</CardTitle>
            <CardDescription>
              {tr.signRequired}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signatureData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-700">{tr.signed}</p>
                    <p className="text-sm text-green-600">
                      {new Date().toLocaleDateString('tr-TR')} - {new Date().toLocaleTimeString('tr-TR')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSignatureData(null)
                      setShowWaiverModal(true)
                    }}
                  >
                    {tr.resignLabel}
                  </Button>
                </div>
                <div className="border rounded-lg p-2 bg-gray-50">
                  <p className="text-xs text-muted-foreground mb-1">{tr.signed}:</p>
                  <img
                    src={signatureData}
                    alt="Signature"
                    className="max-h-20 mx-auto"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openWaiverModal}
                className="w-full h-24 rounded-lg border-2 border-green-500 bg-green-50 hover:bg-green-100 transition-colors flex flex-col items-center justify-center gap-2"
              >
                <PenLine className="w-8 h-8 text-green-600" />
                <span className="text-lg font-semibold text-green-700">{tr.signViewAndSign}</span>
              </button>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || !signatureData}
        >
          {loading ? tr.saving : tr.submit}
        </Button>
      </form>
    </div>
  )
}
