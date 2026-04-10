'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

function getApiUrl() {
  if (typeof window === 'undefined') return 'https://api.skytrackyp.com/api'
  const hostname = window.location.hostname
  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://api.skytrackyp.com/api'
  }
  return `https://${hostname}:3001/api`
}

function PilotRegisterContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ name: string; username: string } | null>(null)

  useEffect(() => {
    if (window.location.hostname === 'www.skytrackyp.com') {
      window.location.href = window.location.href.replace('www.skytrackyp.com', 'skytrackyp.com')
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.phone.trim() || !form.username.trim() || !form.password) {
      setError('Lütfen zorunlu alanları doldurun')
      return
    }
    if (form.name.trim().length < 3) {
      setError('Ad Soyad en az 3 karakter olmalı')
      return
    }
    if (form.username.trim().length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalı')
      return
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(form.username.trim())) {
      setError('Kullanıcı adı sadece harf, rakam, nokta, tire ve alt çizgi içerebilir')
      return
    }
    if (form.password.length < 4) {
      setError('Şifre en az 4 karakter olmalı')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/pilots/public-register?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          username: form.username.trim().toLowerCase(),
          password: form.password,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json?.error?.message || 'Kayıt başarısız. Bilgilerinizi kontrol edin.')
        setLoading(false)
        return
      }
      setSuccess({ name: json.data.name, username: json.data.username })
    } catch {
      setError('Bağlantı hatası. İnternet bağlantınızı kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 via-blue-600 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full">
          <img src="/skytrack-logo.png" alt="SkyTrack" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Geçersiz Bağlantı</h1>
          <p className="text-gray-600 text-sm">Bu sayfa sadece yöneticinin paylaştığı özel bağlantı ile açılır.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 via-blue-600 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-block bg-green-100 rounded-full p-4 mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Kayıt Başarılı!</h1>
            <p className="text-gray-600">Hoş geldin, <strong>{success.name}</strong></p>
          </div>

          <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-5 mb-4">
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">Giriş bilgilerin</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Kullanıcı adı</p>
                <p className="font-mono font-bold text-lg text-gray-800">{success.username}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Şifre</p>
                <p className="font-mono font-bold text-lg text-gray-800">(belirlediğin şifre)</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Önemli:</strong> Kullanıcı adı ve şifreni unutma. Giriş için <strong>skytrackyp.com</strong> adresine gidip "Giriş Yap" butonuna bas.
            </p>
          </div>

          <a
            href="/login"
            className="block w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-center rounded-xl transition-colors"
          >
            Giriş Sayfasına Git
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-500 via-blue-600 to-purple-600 p-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <img
            src="/skytrack-logo.png"
            alt="SkyTrack"
            className="w-24 h-24 mx-auto mb-4 rounded-3xl shadow-2xl"
          />
          <h1 className="text-3xl font-bold text-white mb-1">SkyTrack</h1>
          <p className="text-sky-100">Pilot Kayıt Formu</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Ad Soyad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="örn. Ahmet Yılmaz"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors"
              autoCapitalize="words"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Telefon <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="05XX XXX XX XX"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors"
              inputMode="tel"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              E-posta
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="örn. ahmet@mail.com (opsiyonel)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors"
              inputMode="email"
              autoCapitalize="none"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wide">Giriş bilgilerin</p>

            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Kullanıcı Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="örn. ahmet (sadece harf/rakam)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors mb-4"
              autoCapitalize="none"
              autoComplete="off"
              required
            />

            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Şifre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="en az 4 karakter"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors"
              autoCapitalize="none"
              autoComplete="off"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Giriş yaparken bu bilgileri kullanacaksın, not al.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-lg rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kaydı Tamamla'
            )}
          </button>
        </form>

        <p className="text-center text-white/80 text-xs mt-6">
          © Alanya Paragliding · SkyTrack
        </p>
      </div>
    </div>
  )
}

export default function PilotRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 via-blue-600 to-purple-600">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    }>
      <PilotRegisterContent />
    </Suspense>
  )
}
