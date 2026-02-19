'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { ArrowLeft, UserPlus, Printer, Download, FileText, Eraser, Check, X, PenLine } from 'lucide-react'
import Link from 'next/link'

const WAIVER_TEXT = `YAMAÇ PARAŞÜTÜ UÇUŞU RİSK VE SORUMLULUK BEYANI

Bu belgeyi imzalayarak aşağıdaki hususları kabul ve beyan ederim:

1. Yamaç paraşütü sporu, doğası gereği tehlikeli bir aktivitedir ve ciddi yaralanma veya ölüm riski taşımaktadır.

2. Uçuş sırasında hava koşulları, ekipman arızası veya diğer öngörülemeyen durumlar nedeniyle kaza meydana gelebileceğini biliyorum.

3. Herhangi bir sağlık problemim (kalp hastalığı, epilepsi, hamilelik, vb.) bulunmamaktadır veya varsa pilot ve yetkilere bildirdim.

4. Uçuş öncesi verilen tüm güvenlik talimatlarına uyacağımı taahhüt ederim.

5. Meydana gelebilecek herhangi bir kaza, yaralanma veya maddi hasar durumunda kooperatif ve pilotu sorumlu tutmayacağımı kabul ederim.

6. 18 yaşından büyük olduğumu veya yasal veli/vasi onayı aldığımı beyan ederim.`

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

// Dynamic API URL
function getApiUrl() {
  if (typeof window === 'undefined') return 'https://api.skytrackyp.com/api'
  const hostname = window.location.hostname
  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://api.skytrackyp.com/api'
  }
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname.replace(/^[^.]+/, 'api')}/api`
  }
  return `https://${hostname}:3001/api`
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

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

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

  const ALL_COUNTRIES = [
    { code: '+90', flag: '🇹🇷', name: 'Türkiye' },
    { code: '+93', flag: '🇦🇫', name: 'Afganistan' },
    { code: '+355', flag: '🇦🇱', name: 'Arnavutluk' },
    { code: '+213', flag: '🇩🇿', name: 'Cezayir' },
    { code: '+376', flag: '🇦🇩', name: 'Andorra' },
    { code: '+244', flag: '🇦🇴', name: 'Angola' },
    { code: '+54', flag: '🇦🇷', name: 'Arjantin' },
    { code: '+374', flag: '🇦🇲', name: 'Ermenistan' },
    { code: '+61', flag: '🇦🇺', name: 'Avustralya' },
    { code: '+43', flag: '🇦🇹', name: 'Avusturya' },
    { code: '+994', flag: '🇦🇿', name: 'Azerbaycan' },
    { code: '+1-242', flag: '🇧🇸', name: 'Bahamalar' },
    { code: '+973', flag: '🇧🇭', name: 'Bahreyn' },
    { code: '+880', flag: '🇧🇩', name: 'Bangladeş' },
    { code: '+375', flag: '🇧🇾', name: 'Beyaz Rusya' },
    { code: '+32', flag: '🇧🇪', name: 'Belçika' },
    { code: '+501', flag: '🇧🇿', name: 'Belize' },
    { code: '+229', flag: '🇧🇯', name: 'Benin' },
    { code: '+975', flag: '🇧🇹', name: 'Bhutan' },
    { code: '+591', flag: '🇧🇴', name: 'Bolivya' },
    { code: '+387', flag: '🇧🇦', name: 'Bosna Hersek' },
    { code: '+267', flag: '🇧🇼', name: 'Botsvana' },
    { code: '+55', flag: '🇧🇷', name: 'Brezilya' },
    { code: '+673', flag: '🇧🇳', name: 'Brunei' },
    { code: '+359', flag: '🇧🇬', name: 'Bulgaristan' },
    { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
    { code: '+257', flag: '🇧🇮', name: 'Burundi' },
    { code: '+855', flag: '🇰🇭', name: 'Kamboçya' },
    { code: '+237', flag: '🇨🇲', name: 'Kamerun' },
    { code: '+1', flag: '🇨🇦', name: 'Kanada' },
    { code: '+238', flag: '🇨🇻', name: 'Yeşil Burun' },
    { code: '+236', flag: '🇨🇫', name: 'Orta Afrika' },
    { code: '+235', flag: '🇹🇩', name: 'Çad' },
    { code: '+56', flag: '🇨🇱', name: 'Şili' },
    { code: '+86', flag: '🇨🇳', name: 'Çin' },
    { code: '+57', flag: '🇨🇴', name: 'Kolombiya' },
    { code: '+269', flag: '🇰🇲', name: 'Komorlar' },
    { code: '+243', flag: '🇨🇩', name: 'Kongo (DR)' },
    { code: '+242', flag: '🇨🇬', name: 'Kongo' },
    { code: '+506', flag: '🇨🇷', name: 'Kosta Rika' },
    { code: '+385', flag: '🇭🇷', name: 'Hırvatistan' },
    { code: '+53', flag: '🇨🇺', name: 'Küba' },
    { code: '+357', flag: '🇨🇾', name: 'Kıbrıs' },
    { code: '+420', flag: '🇨🇿', name: 'Çekya' },
    { code: '+45', flag: '🇩🇰', name: 'Danimarka' },
    { code: '+253', flag: '🇩🇯', name: 'Cibuti' },
    { code: '+1-809', flag: '🇩🇴', name: 'Dominik Cum.' },
    { code: '+593', flag: '🇪🇨', name: 'Ekvador' },
    { code: '+20', flag: '🇪🇬', name: 'Mısır' },
    { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
    { code: '+240', flag: '🇬🇶', name: 'Ekvator Ginesi' },
    { code: '+291', flag: '🇪🇷', name: 'Eritre' },
    { code: '+372', flag: '🇪🇪', name: 'Estonya' },
    { code: '+268', flag: '🇸🇿', name: 'Esvatini' },
    { code: '+251', flag: '🇪🇹', name: 'Etiyopya' },
    { code: '+679', flag: '🇫🇯', name: 'Fiji' },
    { code: '+358', flag: '🇫🇮', name: 'Finlandiya' },
    { code: '+33', flag: '🇫🇷', name: 'Fransa' },
    { code: '+241', flag: '🇬🇦', name: 'Gabon' },
    { code: '+220', flag: '🇬🇲', name: 'Gambiya' },
    { code: '+995', flag: '🇬🇪', name: 'Gürcistan' },
    { code: '+49', flag: '🇩🇪', name: 'Almanya' },
    { code: '+233', flag: '🇬🇭', name: 'Gana' },
    { code: '+30', flag: '🇬🇷', name: 'Yunanistan' },
    { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
    { code: '+224', flag: '🇬🇳', name: 'Gine' },
    { code: '+245', flag: '🇬🇼', name: 'Gine-Bissau' },
    { code: '+592', flag: '🇬🇾', name: 'Guyana' },
    { code: '+509', flag: '🇭🇹', name: 'Haiti' },
    { code: '+504', flag: '🇭🇳', name: 'Honduras' },
    { code: '+36', flag: '🇭🇺', name: 'Macaristan' },
    { code: '+354', flag: '🇮🇸', name: 'İzlanda' },
    { code: '+91', flag: '🇮🇳', name: 'Hindistan' },
    { code: '+62', flag: '🇮🇩', name: 'Endonezya' },
    { code: '+98', flag: '🇮🇷', name: 'İran' },
    { code: '+964', flag: '🇮🇶', name: 'Irak' },
    { code: '+353', flag: '🇮🇪', name: 'İrlanda' },
    { code: '+972', flag: '🇮🇱', name: 'İsrail' },
    { code: '+39', flag: '🇮🇹', name: 'İtalya' },
    { code: '+1-876', flag: '🇯🇲', name: 'Jamaika' },
    { code: '+81', flag: '🇯🇵', name: 'Japonya' },
    { code: '+962', flag: '🇯🇴', name: 'Ürdün' },
    { code: '+7', flag: '🇰🇿', name: 'Kazakistan' },
    { code: '+254', flag: '🇰🇪', name: 'Kenya' },
    { code: '+686', flag: '🇰🇮', name: 'Kiribati' },
    { code: '+850', flag: '🇰🇵', name: 'Kuzey Kore' },
    { code: '+82', flag: '🇰🇷', name: 'Güney Kore' },
    { code: '+965', flag: '🇰🇼', name: 'Kuveyt' },
    { code: '+996', flag: '🇰🇬', name: 'Kırgızistan' },
    { code: '+856', flag: '🇱🇦', name: 'Laos' },
    { code: '+371', flag: '🇱🇻', name: 'Letonya' },
    { code: '+961', flag: '🇱🇧', name: 'Lübnan' },
    { code: '+266', flag: '🇱🇸', name: 'Lesoto' },
    { code: '+231', flag: '🇱🇷', name: 'Liberya' },
    { code: '+218', flag: '🇱🇾', name: 'Libya' },
    { code: '+423', flag: '🇱🇮', name: 'Lihtenştayn' },
    { code: '+370', flag: '🇱🇹', name: 'Litvanya' },
    { code: '+352', flag: '🇱🇺', name: 'Lüksemburg' },
    { code: '+261', flag: '🇲🇬', name: 'Madagaskar' },
    { code: '+265', flag: '🇲🇼', name: 'Malavi' },
    { code: '+60', flag: '🇲🇾', name: 'Malezya' },
    { code: '+960', flag: '🇲🇻', name: 'Maldivler' },
    { code: '+223', flag: '🇲🇱', name: 'Mali' },
    { code: '+356', flag: '🇲🇹', name: 'Malta' },
    { code: '+222', flag: '🇲🇷', name: 'Moritanya' },
    { code: '+230', flag: '🇲🇺', name: 'Mauritius' },
    { code: '+52', flag: '🇲🇽', name: 'Meksika' },
    { code: '+373', flag: '🇲🇩', name: 'Moldova' },
    { code: '+377', flag: '🇲🇨', name: 'Monako' },
    { code: '+976', flag: '🇲🇳', name: 'Moğolistan' },
    { code: '+382', flag: '🇲🇪', name: 'Karadağ' },
    { code: '+212', flag: '🇲🇦', name: 'Fas' },
    { code: '+258', flag: '🇲🇿', name: 'Mozambik' },
    { code: '+95', flag: '🇲🇲', name: 'Myanmar' },
    { code: '+264', flag: '🇳🇦', name: 'Namibya' },
    { code: '+977', flag: '🇳🇵', name: 'Nepal' },
    { code: '+31', flag: '🇳🇱', name: 'Hollanda' },
    { code: '+64', flag: '🇳🇿', name: 'Yeni Zelanda' },
    { code: '+505', flag: '🇳🇮', name: 'Nikaragua' },
    { code: '+227', flag: '🇳🇪', name: 'Nijer' },
    { code: '+234', flag: '🇳🇬', name: 'Nijerya' },
    { code: '+389', flag: '🇲🇰', name: 'Kuzey Makedonya' },
    { code: '+47', flag: '🇳🇴', name: 'Norveç' },
    { code: '+968', flag: '🇴🇲', name: 'Umman' },
    { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
    { code: '+507', flag: '🇵🇦', name: 'Panama' },
    { code: '+675', flag: '🇵🇬', name: 'Papua Yeni Gine' },
    { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
    { code: '+51', flag: '🇵🇪', name: 'Peru' },
    { code: '+63', flag: '🇵🇭', name: 'Filipinler' },
    { code: '+48', flag: '🇵🇱', name: 'Polonya' },
    { code: '+351', flag: '🇵🇹', name: 'Portekiz' },
    { code: '+974', flag: '🇶🇦', name: 'Katar' },
    { code: '+40', flag: '🇷🇴', name: 'Romanya' },
    { code: '+7', flag: '🇷🇺', name: 'Rusya' },
    { code: '+250', flag: '🇷🇼', name: 'Ruanda' },
    { code: '+966', flag: '🇸🇦', name: 'Suudi Arabistan' },
    { code: '+221', flag: '🇸🇳', name: 'Senegal' },
    { code: '+381', flag: '🇷🇸', name: 'Sırbistan' },
    { code: '+232', flag: '🇸🇱', name: 'Sierra Leone' },
    { code: '+65', flag: '🇸🇬', name: 'Singapur' },
    { code: '+421', flag: '🇸🇰', name: 'Slovakya' },
    { code: '+386', flag: '🇸🇮', name: 'Slovenya' },
    { code: '+252', flag: '🇸🇴', name: 'Somali' },
    { code: '+27', flag: '🇿🇦', name: 'Güney Afrika' },
    { code: '+211', flag: '🇸🇸', name: 'Güney Sudan' },
    { code: '+34', flag: '🇪🇸', name: 'İspanya' },
    { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
    { code: '+249', flag: '🇸🇩', name: 'Sudan' },
    { code: '+597', flag: '🇸🇷', name: 'Surinam' },
    { code: '+46', flag: '🇸🇪', name: 'İsveç' },
    { code: '+41', flag: '🇨🇭', name: 'İsviçre' },
    { code: '+963', flag: '🇸🇾', name: 'Suriye' },
    { code: '+886', flag: '🇹🇼', name: 'Tayvan' },
    { code: '+992', flag: '🇹🇯', name: 'Tacikistan' },
    { code: '+255', flag: '🇹🇿', name: 'Tanzanya' },
    { code: '+66', flag: '🇹🇭', name: 'Tayland' },
    { code: '+228', flag: '🇹🇬', name: 'Togo' },
    { code: '+676', flag: '🇹🇴', name: 'Tonga' },
    { code: '+1-868', flag: '🇹🇹', name: 'Trinidad ve Tobago' },
    { code: '+216', flag: '🇹🇳', name: 'Tunus' },
    { code: '+993', flag: '🇹🇲', name: 'Türkmenistan' },
    { code: '+256', flag: '🇺🇬', name: 'Uganda' },
    { code: '+380', flag: '🇺🇦', name: 'Ukrayna' },
    { code: '+971', flag: '🇦🇪', name: 'Birleşik Arap Emirlikleri' },
    { code: '+44', flag: '🇬🇧', name: 'İngiltere' },
    { code: '+1', flag: '🇺🇸', name: 'ABD' },
    { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
    { code: '+998', flag: '🇺🇿', name: 'Özbekistan' },
    { code: '+678', flag: '🇻🇺', name: 'Vanuatu' },
    { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
    { code: '+84', flag: '🇻🇳', name: 'Vietnam' },
    { code: '+967', flag: '🇾🇪', name: 'Yemen' },
    { code: '+260', flag: '🇿🇲', name: 'Zambiya' },
    { code: '+263', flag: '🇿🇼', name: 'Zimbabve' },
  ]

  const selectedCountry = ALL_COUNTRIES.find(c => c.code === countryCode && c.name === (ALL_COUNTRIES.find(x => x.code === countryCode)?.name)) || ALL_COUNTRIES[0]

  const filteredCountries = ALL_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch)
  )

  // Handle canvas resize for fullscreen modal
  useEffect(() => {
    if (showWaiverModal && signatureRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const canvas = signatureRef.current?.getCanvas()
        if (canvas) {
          const parent = canvas.parentElement
          if (parent) {
            const rect = parent.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height
            // Clear and set background after resize
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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
  }

  const handleSignatureConfirm = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const data = signatureRef.current.toDataURL('image/png')
      setSignatureData(data)
      setShowWaiverModal(false)
    }
  }

  const handleSignatureCancel = () => {
    setShowWaiverModal(false)
    signatureRef.current?.clear()
  }

  const openWaiverModal = () => {
    // Validate form before opening modal
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError('Lütfen önce Ad, Soyad ve Telefon bilgilerini doldurun')
      return
    }
    setError('')
    setShowWaiverModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!signatureData) {
      setError('Lütfen risk formunu imzalayın')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/customers', {
        ...formData,
        phone: `${countryCode}${formData.phone}`,
        waiverSigned: true,
        signatureData,
      })
      setResult(response.data.data)
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.response?.data?.error?.message || 'Kayıt oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && result) {
      const now = new Date()
      const dateStr = now.toLocaleDateString('tr-TR')
      const timeStr = now.toLocaleTimeString('tr-TR')
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Kod - ${result.customer.displayId}</title>
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            @media print {
              html, body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 10px;
              margin: 0;
            }
            .qr-container {
              width: 5cm;
              margin: 0 auto;
              padding: 10px;
              border: 1px dashed #ccc;
            }
            .qr-code { width: 4cm; height: 4cm; }
            .display-id {
              font-size: 14px;
              font-weight: bold;
              margin-top: 5px;
            }
            .customer-name {
              font-size: 12px;
              color: #666;
            }
            .datetime {
              font-size: 10px;
              color: #888;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${result.qrCode}" alt="QR Code" class="qr-code" />
            <div class="display-id">${result.customer.displayId}</div>
            <div class="customer-name">${result.customer.firstName} ${result.customer.lastName}</div>
            <div class="datetime">${dateStr} - ${timeStr}</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handlePrintWaiver = () => {
    if (result && signatureData) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const now = new Date()
        const dateStr = now.toLocaleDateString('tr-TR')
        const timeStr = now.toLocaleTimeString('tr-TR')

        const waiverText = `YAMAC PARASUTU UCUSU RISK VE SORUMLULUK BEYANI

Bu belgeyi imzalayarak asagidaki hususlari kabul ve beyan ederim:

1. Yamac parasutu sporu, dogasi geregi tehlikeli bir aktivitedir ve ciddi yaralanma veya olum riski tasimaktadir.

2. Ucus sirasinda hava kosullari, ekipman arizasi veya diger ongorulemeyen durumlar nedeniyle kaza meydana gelebilecegini biliyorum.

3. Herhangi bir saglik problemim (kalp hastaligi, epilepsi, hamilelik, vb.) bulunmamaktadir veya varsa pilot ve yetkilere bildirdim.

4. Ucus oncesi verilen tum guvenlik talimatlarina uyacagimi taahhut ederim.

5. Meydana gelebilecek herhangi bir kaza, yaralanma veya maddi hasar durumunda kooperatif ve pilotu sorumlu tutmayacagimi kabul ederim.

6. 18 yasindan buyuk oldugumu veya yasal veli/vasi onayi aldigimi beyan ederim.`

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Risk Formu - ${result.customer.displayId}</title>
            <style>
              @page {
                size: A4;
                margin: 15mm;
              }
              @media print {
                html, body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                margin: 0;
                font-size: 12px;
                line-height: 1.5;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .header h1 {
                font-size: 18px;
                margin: 0 0 5px 0;
              }
              .header h2 {
                font-size: 14px;
                margin: 0;
                font-weight: normal;
              }
              .info-box {
                border: 1px solid #ccc;
                padding: 10px;
                margin-bottom: 15px;
                background: #f9f9f9;
              }
              .info-box p {
                margin: 3px 0;
              }
              .waiver-text {
                white-space: pre-line;
                text-align: justify;
                margin-bottom: 20px;
              }
              .signature-section {
                margin-top: 30px;
              }
              .signature-section h3 {
                font-size: 12px;
                margin-bottom: 10px;
                text-decoration: underline;
              }
              .signature-name {
                font-weight: bold;
                margin-bottom: 5px;
              }
              .signature-img {
                max-width: 200px;
                max-height: 80px;
                border-bottom: 1px solid #000;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>ALANYA PARAGLIDING</h1>
              <h2>RISK VE SORUMLULUK BEYANI</h2>
            </div>

            <div class="info-box">
              <p><strong>Musteri No:</strong> ${result.customer.displayId}</p>
              <p><strong>Ad Soyad:</strong> ${result.customer.firstName} ${result.customer.lastName}</p>
              <p><strong>Tarih:</strong> ${dateStr}</p>
              <p><strong>Saat:</strong> ${timeStr}</p>
            </div>

            <div class="waiver-text">${waiverText}</div>

            <div class="signature-section">
              <h3>IMZA</h3>
              <p>Yukaridaki beyani okudum, anladim ve kabul ediyorum.</p>
              <p class="signature-name">${result.customer.firstName} ${result.customer.lastName}</p>
              <img src="${signatureData}" alt="Imza" class="signature-img" />
            </div>

            <script>window.onload = () => window.print();</script>
          </body>
          </html>
        `)
        printWindow.document.close()
      }
    }
  }

  const handleDownloadQR = () => {
    if (result) {
      const link = document.createElement('a')
      link.href = result.qrCode
      link.download = `${result.customer.displayId}-qr.png`
      link.click()
    }
  }

  const resetForm = () => {
    setResult(null)
    setSignatureData(null)
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

  // Fullscreen Waiver Modal
  if (showWaiverModal) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-blue-600 text-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Risk ve Sorumluluk Beyanı</h1>
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
            {WAIVER_TEXT}
          </div>

          {/* Signature Area */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-lg font-semibold">Aşağıya imzanızı atın:</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
              >
                <Eraser className="w-4 h-4 mr-1" />
                Temizle
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
              Parmağınız veya mouse ile yukarıdaki alana imzanızı atın
            </p>
          </div>
        </div>

        {/* Footer Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 bg-gray-100 border-t flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 text-base"
            onClick={handleSignatureCancel}
          >
            <X className="w-5 h-5 mr-2" />
            İptal
          </Button>
          <Button
            className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700"
            onClick={handleSignatureConfirm}
          >
            <Check className="w-5 h-5 mr-2" />
            İmzayı Onayla
          </Button>
        </div>
      </div>
    )
  }

  // Success state - show QR code
  if (result) {
    const now = new Date()
    const dateStr = now.toLocaleDateString('tr-TR')
    const timeStr = now.toLocaleTimeString('tr-TR')

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CardTitle className="text-green-700">Kayıt Başarılı!</CardTitle>
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

            {result.pilot && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Atanan Pilot</p>
                <p className="text-lg font-semibold text-blue-700">{result.pilot.name}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="w-4 h-4 mr-2" />
                QR Yazdır
              </Button>
              <Button onClick={handleDownloadQR} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                QR İndir
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handlePrintWaiver}
              >
                <Printer className="w-4 h-4 mr-2" />
                Risk Formu Yazdır
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`${API_URL}/customers/${result.customer.id}/waiver-pdf`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF İndir
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetForm}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Yeni Kayıt
              </Button>
              <Link href={`/admin/customers/${result.customer.id}`} className="flex-1">
                <Button variant="secondary" className="w-full">
                  Detayları Gör
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Registration form
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Yeni Müşteri Kaydı</h1>
          <p className="text-muted-foreground">Müşteri bilgilerini doldurun</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Kişisel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Adı"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Soyadı"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon *</Label>
              <div className="flex gap-2">
                {/* Searchable country code picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(v => !v)}
                    className="flex h-10 items-center gap-1 rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap"
                  >
                    {ALL_COUNTRIES.find(c => c.code === countryCode)?.flag} {countryCode}
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
                          placeholder="Ülke adı veya kod..."
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
                          <li className="px-3 py-2 text-sm text-muted-foreground">Sonuç bulunamadı</li>
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
              <Label htmlFor="email">E-posta *</Label>
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
              <Label htmlFor="emergencyContact">Acil Durumda Aranacak Kişi</Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="İsim"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Kilo (kg) *</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                min="20"
                max="150"
                value={formData.weight}
                onChange={handleChange}
                placeholder="Örn: 70"
                required
              />
              <p className="text-xs text-muted-foreground">
                Uçuş güvenliği için gereklidir (20-150 kg)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk ve Sorumluluk Beyanı</CardTitle>
            <CardDescription>
              Uçuş öncesi risk formunu imzalamanız gerekmektedir
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
                    <p className="font-semibold text-green-700">Risk Formu İmzalandı</p>
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
                    Yeniden İmzala
                  </Button>
                </div>
                <div className="border rounded-lg p-2 bg-gray-50">
                  <p className="text-xs text-muted-foreground mb-1">İmza Önizleme:</p>
                  <img
                    src={signatureData}
                    alt="İmza"
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
                <span className="text-lg font-semibold text-green-700">Risk Formunu Görüntüle ve İmzala</span>
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
          {loading ? 'Kaydediliyor...' : 'Kaydı Tamamla ve QR Oluştur'}
        </Button>
      </form>
    </div>
  )
}
