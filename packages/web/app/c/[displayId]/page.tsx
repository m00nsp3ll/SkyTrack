'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  Download,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Plane,
  User,
  Wifi,
  Globe,
  Lock,
} from 'lucide-react'

interface CustomerData {
  displayId: string
  firstName: string
  language: string
  status: string
  pilot: { id: string; name: string } | null
  flight: {
    status: string
    takeoffAt: string | null
    landingAt: string | null
  } | null
  media: {
    fileCount: number
    deliveryStatus: string
    canDownload: boolean
    hasPendingPayment: boolean
  } | null
}

// 10 language translations for customer-facing download page
type Lang = 'tr' | 'en' | 'ru' | 'de' | 'ar' | 'pl' | 'uk' | 'zh' | 'fr' | 'fa'

interface PageTexts {
  title: string
  subtitle: string
  customerNo: string
  hello: string
  yourPilot: string
  registered: string
  registeredDesc: string
  assigned: string
  assignedDesc: string
  inFlight: string
  inFlightDesc: string
  completed: string
  completedDesc: string
  cancelled: string
  cancelledDesc: string
  readyToDownload: string
  filesReady: string
  localNetwork: string
  viaInternet: string
  downloadPhotos: string
  zipNote: string
  paymentPending: string
  mediaReady: string
  paymentInstructions: string
  goToCashier: string
  autoUpdate: string
  photosBeingPrepared: string
  photosComingSoon: string
  pageAutoUpdate: string
  contactStaff: string
  lastUpdate: string
}

const i18n: Record<Lang, PageTexts> = {
  tr: {
    title: 'Alanya Paragliding',
    subtitle: 'Yamaç Paraşütü Deneyimi',
    customerNo: 'Müşteri Numarası',
    hello: 'Merhaba',
    yourPilot: 'Pilotunuz',
    registered: 'Kayıt Tamamlandı',
    registeredDesc: 'Pilot ataması bekleniyor...',
    assigned: 'Pilot Atandı',
    assignedDesc: 'Uçuşunuz için hazırlanıyor...',
    inFlight: 'Uçuşta',
    inFlightDesc: 'Keyifli uçuşlar!',
    completed: 'Uçuş Tamamlandı',
    completedDesc: 'Teşekkürler!',
    cancelled: 'İptal Edildi',
    cancelledDesc: 'Uçuşunuz iptal edilmiştir.',
    readyToDownload: 'İndirmeye Hazır!',
    filesReady: 'dosya indirmeye hazır',
    localNetwork: 'Yerel Ağ (Hızlı İndirme)',
    viaInternet: 'İnternet Üzerinden',
    downloadPhotos: 'Fotoğrafları İndir',
    zipNote: 'ZIP dosyası indirilecek. Telefonunuz otomatik olarak açacaktır.',
    paymentPending: 'Ödeme Bekleniyor',
    mediaReady: 'foto/video hazır.',
    paymentInstructions: 'Kasada ödemenizi yaptıktan sonra indirme otomatik olarak aktif olacaktır.',
    goToCashier: 'Lütfen kasaya giderek ödemenizi tamamlayın.',
    autoUpdate: 'Bu sayfa otomatik olarak güncellenecektir.',
    photosBeingPrepared: 'Fotoğraflar Hazırlanıyor',
    photosComingSoon: 'Fotoğraf ve videolarınız yakında yüklenecek.',
    pageAutoUpdate: 'Bu sayfa otomatik olarak güncellenecektir.',
    contactStaff: 'Sorularınız için lütfen görevlilerimize danışın.',
    lastUpdate: 'Son güncelleme',
  },
  en: {
    title: 'Alanya Paragliding',
    subtitle: 'Paragliding Experience',
    customerNo: 'Customer Number',
    hello: 'Hello',
    yourPilot: 'Your Pilot',
    registered: 'Registration Complete',
    registeredDesc: 'Waiting for pilot assignment...',
    assigned: 'Pilot Assigned',
    assignedDesc: 'Preparing for your flight...',
    inFlight: 'In Flight',
    inFlightDesc: 'Enjoy your flight!',
    completed: 'Flight Completed',
    completedDesc: 'Thank you!',
    cancelled: 'Cancelled',
    cancelledDesc: 'Your flight has been cancelled.',
    readyToDownload: 'Ready to Download!',
    filesReady: 'files ready to download',
    localNetwork: 'Local Network (Fast Download)',
    viaInternet: 'Via Internet',
    downloadPhotos: 'Download Photos',
    zipNote: 'A ZIP file will be downloaded. Your phone will open it automatically.',
    paymentPending: 'Payment Pending',
    mediaReady: 'photos/videos ready.',
    paymentInstructions: 'Download will be activated automatically after payment at the cashier.',
    goToCashier: 'Please go to the cashier to complete your payment.',
    autoUpdate: 'This page will update automatically.',
    photosBeingPrepared: 'Photos Being Prepared',
    photosComingSoon: 'Your photos and videos will be uploaded soon.',
    pageAutoUpdate: 'This page will update automatically.',
    contactStaff: 'Please contact our staff for questions.',
    lastUpdate: 'Last update',
  },
  ru: {
    title: 'Alanya Paragliding',
    subtitle: 'Полёт на параплане',
    customerNo: 'Номер клиента',
    hello: 'Привет',
    yourPilot: 'Ваш пилот',
    registered: 'Регистрация завершена',
    registeredDesc: 'Ожидание назначения пилота...',
    assigned: 'Пилот назначен',
    assignedDesc: 'Подготовка к полёту...',
    inFlight: 'В полёте',
    inFlightDesc: 'Приятного полёта!',
    completed: 'Полёт завершён',
    completedDesc: 'Спасибо!',
    cancelled: 'Отменён',
    cancelledDesc: 'Ваш полёт был отменён.',
    readyToDownload: 'Готово к загрузке!',
    filesReady: 'файлов готово к загрузке',
    localNetwork: 'Локальная сеть (Быстрая загрузка)',
    viaInternet: 'Через интернет',
    downloadPhotos: 'Скачать фотографии',
    zipNote: 'Будет загружен ZIP-файл. Ваш телефон откроет его автоматически.',
    paymentPending: 'Ожидание оплаты',
    mediaReady: 'фото/видео готовы.',
    paymentInstructions: 'Загрузка станет доступна автоматически после оплаты на кассе.',
    goToCashier: 'Пожалуйста, оплатите на кассе.',
    autoUpdate: 'Эта страница обновится автоматически.',
    photosBeingPrepared: 'Фотографии готовятся',
    photosComingSoon: 'Ваши фото и видео скоро будут загружены.',
    pageAutoUpdate: 'Эта страница обновится автоматически.',
    contactStaff: 'По вопросам обращайтесь к персоналу.',
    lastUpdate: 'Последнее обновление',
  },
  de: {
    title: 'Alanya Paragliding',
    subtitle: 'Gleitschirm-Erlebnis',
    customerNo: 'Kundennummer',
    hello: 'Hallo',
    yourPilot: 'Ihr Pilot',
    registered: 'Registrierung abgeschlossen',
    registeredDesc: 'Warten auf Pilotzuweisung...',
    assigned: 'Pilot zugewiesen',
    assignedDesc: 'Vorbereitung auf Ihren Flug...',
    inFlight: 'Im Flug',
    inFlightDesc: 'Genießen Sie Ihren Flug!',
    completed: 'Flug abgeschlossen',
    completedDesc: 'Vielen Dank!',
    cancelled: 'Storniert',
    cancelledDesc: 'Ihr Flug wurde storniert.',
    readyToDownload: 'Bereit zum Download!',
    filesReady: 'Dateien zum Download bereit',
    localNetwork: 'Lokales Netzwerk (Schneller Download)',
    viaInternet: 'Über Internet',
    downloadPhotos: 'Fotos herunterladen',
    zipNote: 'Eine ZIP-Datei wird heruntergeladen. Ihr Telefon öffnet sie automatisch.',
    paymentPending: 'Zahlung ausstehend',
    mediaReady: 'Fotos/Videos bereit.',
    paymentInstructions: 'Der Download wird nach Zahlung an der Kasse automatisch aktiviert.',
    goToCashier: 'Bitte gehen Sie zur Kasse.',
    autoUpdate: 'Diese Seite wird automatisch aktualisiert.',
    photosBeingPrepared: 'Fotos werden vorbereitet',
    photosComingSoon: 'Ihre Fotos und Videos werden bald hochgeladen.',
    pageAutoUpdate: 'Diese Seite wird automatisch aktualisiert.',
    contactStaff: 'Bei Fragen wenden Sie sich bitte an unser Personal.',
    lastUpdate: 'Letzte Aktualisierung',
  },
  ar: {
    title: 'Alanya Paragliding',
    subtitle: 'تجربة الطيران الشراعي',
    customerNo: 'رقم العميل',
    hello: 'مرحباً',
    yourPilot: 'طيارك',
    registered: 'تم التسجيل',
    registeredDesc: 'في انتظار تعيين الطيار...',
    assigned: 'تم تعيين الطيار',
    assignedDesc: 'جارٍ التحضير لرحلتك...',
    inFlight: 'في الهواء',
    inFlightDesc: 'رحلة ممتعة!',
    completed: 'اكتملت الرحلة',
    completedDesc: 'شكراً لك!',
    cancelled: 'ملغاة',
    cancelledDesc: 'تم إلغاء رحلتك.',
    readyToDownload: 'جاهز للتحميل!',
    filesReady: 'ملفات جاهزة للتحميل',
    localNetwork: 'شبكة محلية (تحميل سريع)',
    viaInternet: 'عبر الإنترنت',
    downloadPhotos: 'تحميل الصور',
    zipNote: 'سيتم تحميل ملف ZIP. هاتفك سيفتحه تلقائياً.',
    paymentPending: 'في انتظار الدفع',
    mediaReady: 'صور/فيديو جاهزة.',
    paymentInstructions: 'سيتم تفعيل التحميل تلقائياً بعد الدفع في الكاشير.',
    goToCashier: 'يرجى الذهاب إلى الكاشير لإتمام الدفع.',
    autoUpdate: 'ستتحدث هذه الصفحة تلقائياً.',
    photosBeingPrepared: 'جارٍ تحضير الصور',
    photosComingSoon: 'سيتم تحميل صورك وفيديوهاتك قريباً.',
    pageAutoUpdate: 'ستتحدث هذه الصفحة تلقائياً.',
    contactStaff: 'للاستفسارات يرجى التواصل مع الموظفين.',
    lastUpdate: 'آخر تحديث',
  },
  pl: {
    title: 'Alanya Paragliding',
    subtitle: 'Lot paralotnią',
    customerNo: 'Numer klienta',
    hello: 'Cześć',
    yourPilot: 'Twój pilot',
    registered: 'Rejestracja zakończona',
    registeredDesc: 'Oczekiwanie na przypisanie pilota...',
    assigned: 'Pilot przypisany',
    assignedDesc: 'Przygotowanie do lotu...',
    inFlight: 'W locie',
    inFlightDesc: 'Miłego lotu!',
    completed: 'Lot zakończony',
    completedDesc: 'Dziękujemy!',
    cancelled: 'Anulowany',
    cancelledDesc: 'Twój lot został anulowany.',
    readyToDownload: 'Gotowe do pobrania!',
    filesReady: 'plików gotowych do pobrania',
    localNetwork: 'Sieć lokalna (Szybkie pobieranie)',
    viaInternet: 'Przez internet',
    downloadPhotos: 'Pobierz zdjęcia',
    zipNote: 'Plik ZIP zostanie pobrany. Telefon otworzy go automatycznie.',
    paymentPending: 'Oczekiwanie na płatność',
    mediaReady: 'zdjęć/filmów gotowych.',
    paymentInstructions: 'Pobieranie zostanie aktywowane automatycznie po dokonaniu płatności w kasie.',
    goToCashier: 'Proszę udać się do kasy.',
    autoUpdate: 'Ta strona zaktualizuje się automatycznie.',
    photosBeingPrepared: 'Zdjęcia są przygotowywane',
    photosComingSoon: 'Twoje zdjęcia i filmy zostaną wkrótce przesłane.',
    pageAutoUpdate: 'Ta strona zaktualizuje się automatycznie.',
    contactStaff: 'W razie pytań skontaktuj się z personelem.',
    lastUpdate: 'Ostatnia aktualizacja',
  },
  uk: {
    title: 'Alanya Paragliding',
    subtitle: 'Політ на параплані',
    customerNo: 'Номер клієнта',
    hello: 'Привіт',
    yourPilot: 'Ваш пілот',
    registered: 'Реєстрацію завершено',
    registeredDesc: 'Очікування призначення пілота...',
    assigned: 'Пілота призначено',
    assignedDesc: 'Підготовка до польоту...',
    inFlight: 'У польоті',
    inFlightDesc: 'Приємного польоту!',
    completed: 'Політ завершено',
    completedDesc: 'Дякуємо!',
    cancelled: 'Скасовано',
    cancelledDesc: 'Ваш політ було скасовано.',
    readyToDownload: 'Готово до завантаження!',
    filesReady: 'файлів готових до завантаження',
    localNetwork: 'Локальна мережа (Швидке завантаження)',
    viaInternet: 'Через інтернет',
    downloadPhotos: 'Завантажити фотографії',
    zipNote: 'Буде завантажений ZIP-файл. Ваш телефон відкриє його автоматично.',
    paymentPending: 'Очікування оплати',
    mediaReady: 'фото/відео готові.',
    paymentInstructions: 'Завантаження стане доступним автоматично після оплати на касі.',
    goToCashier: 'Будь ласка, оплатіть на касі.',
    autoUpdate: 'Ця сторінка оновиться автоматично.',
    photosBeingPrepared: 'Фотографії готуються',
    photosComingSoon: 'Ваші фото та відео скоро будуть завантажені.',
    pageAutoUpdate: 'Ця сторінка оновиться автоматично.',
    contactStaff: 'З питаннями звертайтесь до персоналу.',
    lastUpdate: 'Останнє оновлення',
  },
  zh: {
    title: 'Alanya Paragliding',
    subtitle: '滑翔伞体验',
    customerNo: '客户编号',
    hello: '你好',
    yourPilot: '您的飞行员',
    registered: '注册完成',
    registeredDesc: '等待分配飞行员...',
    assigned: '已分配飞行员',
    assignedDesc: '正在为您的飞行做准备...',
    inFlight: '飞行中',
    inFlightDesc: '祝您飞行愉快！',
    completed: '飞行完成',
    completedDesc: '谢谢！',
    cancelled: '已取消',
    cancelledDesc: '您的飞行已被取消。',
    readyToDownload: '准备下载！',
    filesReady: '个文件已准备好下载',
    localNetwork: '本地网络（快速下载）',
    viaInternet: '通过互联网',
    downloadPhotos: '下载照片',
    zipNote: '将下载ZIP文件。您的手机会自动打开。',
    paymentPending: '等待付款',
    mediaReady: '照片/视频已准备就绪。',
    paymentInstructions: '在收银台付款后，下载将自动激活。',
    goToCashier: '请到收银台完成付款。',
    autoUpdate: '此页面将自动更新。',
    photosBeingPrepared: '照片准备中',
    photosComingSoon: '您的照片和视频即将上传。',
    pageAutoUpdate: '此页面将自动更新。',
    contactStaff: '如有疑问，请联系工作人员。',
    lastUpdate: '最后更新',
  },
  fr: {
    title: 'Alanya Paragliding',
    subtitle: 'Expérience de parapente',
    customerNo: 'Numéro client',
    hello: 'Bonjour',
    yourPilot: 'Votre pilote',
    registered: 'Inscription terminée',
    registeredDesc: 'En attente d\'attribution du pilote...',
    assigned: 'Pilote attribué',
    assignedDesc: 'Préparation de votre vol...',
    inFlight: 'En vol',
    inFlightDesc: 'Bon vol !',
    completed: 'Vol terminé',
    completedDesc: 'Merci !',
    cancelled: 'Annulé',
    cancelledDesc: 'Votre vol a été annulé.',
    readyToDownload: 'Prêt à télécharger !',
    filesReady: 'fichiers prêts à télécharger',
    localNetwork: 'Réseau local (Téléchargement rapide)',
    viaInternet: 'Via Internet',
    downloadPhotos: 'Télécharger les photos',
    zipNote: 'Un fichier ZIP sera téléchargé. Votre téléphone l\'ouvrira automatiquement.',
    paymentPending: 'Paiement en attente',
    mediaReady: 'photos/vidéos prêtes.',
    paymentInstructions: 'Le téléchargement sera activé automatiquement après le paiement à la caisse.',
    goToCashier: 'Veuillez vous rendre à la caisse.',
    autoUpdate: 'Cette page se mettra à jour automatiquement.',
    photosBeingPrepared: 'Photos en préparation',
    photosComingSoon: 'Vos photos et vidéos seront bientôt disponibles.',
    pageAutoUpdate: 'Cette page se mettra à jour automatiquement.',
    contactStaff: 'Pour toute question, contactez notre personnel.',
    lastUpdate: 'Dernière mise à jour',
  },
  fa: {
    title: 'Alanya Paragliding',
    subtitle: 'تجربه پاراگلایدر',
    customerNo: 'شماره مشتری',
    hello: 'سلام',
    yourPilot: 'خلبان شما',
    registered: 'ثبت‌نام تکمیل شد',
    registeredDesc: 'در انتظار تعیین خلبان...',
    assigned: 'خلبان تعیین شد',
    assignedDesc: 'در حال آماده‌سازی پرواز...',
    inFlight: 'در حال پرواز',
    inFlightDesc: 'پرواز خوبی داشته باشید!',
    completed: 'پرواز تکمیل شد',
    completedDesc: 'متشکریم!',
    cancelled: 'لغو شد',
    cancelledDesc: 'پرواز شما لغو شده است.',
    readyToDownload: 'آماده دانلود!',
    filesReady: 'فایل آماده دانلود',
    localNetwork: 'شبکه محلی (دانلود سریع)',
    viaInternet: 'از طریق اینترنت',
    downloadPhotos: 'دانلود عکس‌ها',
    zipNote: 'فایل ZIP دانلود خواهد شد. تلفن شما آن را به طور خودکار باز می‌کند.',
    paymentPending: 'در انتظار پرداخت',
    mediaReady: 'عکس/ویدیو آماده است.',
    paymentInstructions: 'دانلود پس از پرداخت در صندوق به طور خودکار فعال می‌شود.',
    goToCashier: 'لطفاً برای پرداخت به صندوق مراجعه کنید.',
    autoUpdate: 'این صفحه به طور خودکار به‌روز می‌شود.',
    photosBeingPrepared: 'عکس‌ها در حال آماده‌سازی',
    photosComingSoon: 'عکس‌ها و ویدیوهای شما به زودی آپلود می‌شوند.',
    pageAutoUpdate: 'این صفحه به طور خودکار به‌روز می‌شود.',
    contactStaff: 'برای سوالات لطفاً با کارکنان تماس بگیرید.',
    lastUpdate: 'آخرین به‌روزرسانی',
  },
}

const RTL_LANGS: Lang[] = ['ar', 'fa']

function getText(lang: string): PageTexts {
  return i18n[lang as Lang] || i18n.en
}

// Get API URL dynamically based on current hostname
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

function getDownloadUrl(displayId: string) {
  if (typeof window === 'undefined') return ''
  const hostname = window.location.hostname

  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return `https://api.skytrackyp.com/api/media/${displayId}/download`
  }
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname.replace(/^[^.]+/, 'api')}/api/media/${displayId}/download`
  }
  return `https://${hostname}:3001/api/media/${displayId}/download`
}

export default function CustomerDownloadPage() {
  const params = useParams()
  const displayId = params.displayId as string
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiUrl, setApiUrl] = useState('')

  const [isLan, setIsLan] = useState(false)
  const [nasHttpsBase, setNasHttpsBase] = useState<string | null>(null)
  const [connectionChecked, setConnectionChecked] = useState(false)

  useEffect(() => {
    setApiUrl(getApiUrl())
  }, [])

  // LAN detection: API'ye sor — client IP ofis sabit IP'siyle (81.213.175.47) eşleşiyorsa LAN
  useEffect(() => {
    if (!apiUrl) return
    fetch(`${apiUrl}/network/discover`, { cache: 'no-store' })
      .then(r => r.json())
      .then(json => {
        if (json.isLan) {
          setIsLan(true)
          setNasHttpsBase(json.nasHttpsBase || 'https://192.168.1.105:8081')
        }
      })
      .catch(() => {})
      .finally(() => setConnectionChecked(true))
  }, [apiUrl])

  const fetchData = useCallback(async () => {
    if (!apiUrl) return
    try {
      const response = await fetch(`${apiUrl}/customers/public/${displayId}`)
      const result = await response.json()
      if (!result.success) { setError('Not found'); return }
      setData(result.data)
      setError(null)
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, displayId])

  useEffect(() => {
    if (apiUrl) {
      fetchData()
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
    }
  }, [fetchData, apiUrl])

  const handleDownload = async () => {
    if (isLan && nasHttpsBase) {
      // LAN'daysa: API'den NAS HTTPS dosya URL'lerini al, her dosyayı aç
      try {
        const res = await fetch(`${apiUrl}/media/${displayId}/lan-info`)
        const json = await res.json()
        if (json.success && json.data.files?.length > 0) {
          for (const file of json.data.files) {
            const a = document.createElement('a')
            a.href = file.url
            a.download = file.name
            a.target = '_blank'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            await new Promise(r => setTimeout(r, 200))
          }
          return
        }
      } catch { /* fallback */ }
    }
    // İnternet üzerinden ZIP indir
    window.location.href = getDownloadUrl(displayId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 via-blue-600 to-purple-600">
        <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">Page Not Found</h1>
            <p className="text-gray-600">{error || 'Invalid QR code'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const lang = (data.language || 'tr') as Lang
  const txt = getText(lang)
  const isRtl = RTL_LANGS.includes(lang)
  const canDownload = data.media?.canDownload

  const statusMap: Record<string, { icon: any; title: string; description: string; color: string }> = {
    REGISTERED: { icon: Clock, title: txt.registered, description: txt.registeredDesc, color: 'text-gray-600' },
    ASSIGNED: { icon: User, title: txt.assigned, description: txt.assignedDesc, color: 'text-blue-600' },
    IN_FLIGHT: { icon: Plane, title: txt.inFlight, description: txt.inFlightDesc, color: 'text-orange-600' },
    COMPLETED: { icon: CheckCircle, title: txt.completed, description: txt.completedDesc, color: 'text-green-600' },
    CANCELLED: { icon: XCircle, title: txt.cancelled, description: txt.cancelledDesc, color: 'text-red-600' },
  }

  const statusInfo = statusMap[data.status] || statusMap.REGISTERED
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-50 p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center pt-8 pb-4">
          <div className="inline-block mb-4">
            <img src="/skytrack-logo.png" alt="SkyTrack" className="w-20 h-20 rounded-2xl shadow-lg object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{txt.title}</h1>
          <p className="text-gray-600">{txt.subtitle}</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">{txt.customerNo}</p>
              <p className="text-3xl font-mono font-bold text-sky-600 mb-2">{data.displayId}</p>
              <p className="text-lg font-medium text-gray-800">{txt.hello}, {data.firstName}!</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full bg-gray-100 ${statusInfo.color}`}>
                <StatusIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{statusInfo.title}</h2>
                <p className="text-gray-600">{statusInfo.description}</p>
              </div>
            </div>

            {data.pilot && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">{txt.yourPilot}</p>
                <p className="font-semibold text-lg">{data.pilot.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {data.status === 'COMPLETED' && (
          <Card className={canDownload ? 'border-green-500 border-2' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                {canDownload ? (
                  <>
                    <div className="inline-block bg-green-100 rounded-full p-4 mb-4">
                      <Camera className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-green-700 mb-2">
                      {txt.readyToDownload}
                    </h2>
                    <p className="text-gray-600 mb-3">
                      {data.media?.fileCount} {txt.filesReady}
                    </p>

                    {connectionChecked && (
                      <div className="mb-4">
                        {isLan ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            <Wifi className="w-3.5 h-3.5" />
                            {txt.localNetwork}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            <Globe className="w-3.5 h-3.5" />
                            {txt.viaInternet}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:from-green-600 hover:to-emerald-700 active:scale-[0.98] transition-all"
                    >
                      <Download className="w-5 h-5" />
                      {txt.downloadPhotos}
                    </button>

                    <p className="text-xs text-gray-500 mt-3">
                      {txt.zipNote}
                    </p>
                  </>
                ) : data.media && (data.media.fileCount > 0 || data.media.hasPendingPayment) ? (
                  <>
                    <div className="inline-block bg-orange-100 rounded-full p-4 mb-4">
                      <Lock className="w-10 h-10 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-bold text-orange-700 mb-2">
                      {txt.paymentPending}
                    </h2>
                    <p className="text-gray-600 mb-4">
                      {data.media.fileCount} {txt.mediaReady}
                      <br />
                      {txt.paymentInstructions}
                    </p>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <p className="text-sm text-orange-700 font-medium">
                        {txt.goToCashier}
                      </p>
                      <p className="text-xs text-orange-500 mt-1">
                        {txt.autoUpdate}
                      </p>
                      <div className="mt-3">
                        <div className="animate-pulse flex items-center justify-center gap-2 text-orange-400">
                          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="inline-block bg-blue-100 rounded-full p-4 mb-4">
                      <Camera className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-blue-700 mb-2">
                      {txt.photosBeingPrepared}
                    </h2>
                    <p className="text-gray-600">
                      {txt.photosComingSoon}
                      <br />
                      {txt.pageAutoUpdate}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-4 pb-8">
          <p className="text-sm text-gray-500">
            {txt.contactStaff}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {txt.lastUpdate}: {new Date().toLocaleTimeString('tr-TR')}
          </p>
        </div>
      </div>
    </div>
  )
}
