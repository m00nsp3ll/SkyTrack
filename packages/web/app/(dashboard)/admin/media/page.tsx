'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mediaApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Camera,
  Clock,
  RefreshCw,
  Search,
  Plane,
  ShoppingBag,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Banknote,
  Truck,
  BarChart3,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  Mail,
  Scale,
  FolderOpen,
  Users,
  Wallet,
  CalendarDays,
} from 'lucide-react'

// ====== TYPES ======

interface DashboardStats {
  todaySoldCount: number
  todayRevenue: number
  deliveredToday: number
  waitingToday: number
  saleRatio: number
  todayFlights: number
  monthTotal: number
  soldCountChange: number
  revenueChange: number
  monthChange: number
}

interface ChartData {
  dailyData: { date: string; revenue: number; sold: number; flights: number }[]
  pieData: { sold: number; notSold: number }
}

interface CashboxData {
  currencies: { currency: string; methods: { method: string; amount: number }[]; total: number }[]
  grandTotalEUR: number
  saleCount: number
}

interface SaleRow {
  flightId: string
  customer: { id: string; displayId: string; firstName: string; lastName: string; phone: string; email: string | null; weight: number | null }
  pilot: { id: string; name: string }
  flightTime: string | null
  flightDuration: number | null
  flightStatus: string
  mediaFolder: { id: string; folderPath: string; fileCount: number; paymentStatus: string; deliveryStatus: string } | null
  sale: {
    id: string; itemName: string; totalPrice: number; totalAmountEUR: number | null
    primaryCurrency: string; paymentStatus: string; paymentMethod: string | null
    soldBy: { id: string; username: string; name: string | null } | null
    paymentDetails: { id: string; currency: string; amount: number; paymentMethod: string }[]
    createdAt: string
  } | null
}

interface StaffSummary {
  id: string; name: string; count: number; totalEUR: number; paidEUR: number; unpaidEUR: number
}

interface PilotSummary {
  id: string; name: string; totalFlights: number; mediaSold: number; filesUploaded: number; waitingUpload: number
}

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', TRY: '₺', RUB: '₽' }
const PAYMENT_LABELS: Record<string, string> = { CASH: 'Nakit', CREDIT_CARD: 'Kart', TRANSFER: 'Havale' }
const PIE_COLORS = ['#22c55e', '#f59e0b']

export default function MediaDashboardPage() {
  // State
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null)
  const [chart, setChart] = useState<ChartData | null>(null)
  const [cashbox, setCashbox] = useState<CashboxData | null>(null)
  const [rows, setRows] = useState<SaleRow[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalCount: 0, totalPages: 0 })
  const [staffSummary, setStaffSummary] = useState<StaffSummary[]>([])
  const [pilotSummary, setPilotSummary] = useState<PilotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)

  // Filters
  const [dateFilter, setDateFilter] = useState('today')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals
  const [selectedRow, setSelectedRow] = useState<SaleRow | null>(null)

  // ====== DATE PARAMS HELPER ======
  const getDateParams = useCallback(() => {
    const params: any = {}
    if (dateFilter === 'custom' && customStart && customEnd) {
      params.date = 'custom'; params.startDate = customStart; params.endDate = customEnd
    } else if (dateFilter === 'today') {
      params.date = 'custom'; params.startDate = selectedDate; params.endDate = selectedDate
    } else {
      params.date = dateFilter
    }
    return params
  }, [dateFilter, customStart, customEnd, selectedDate])

  // ====== DATA FETCHING ======

  const fetchAll = useCallback(async (page = 1) => {
    setTableLoading(true)
    try {
      const dp = getDateParams()
      const tableParams: any = { ...dp, page, limit: 20, payment: paymentFilter, delivery: deliveryFilter }
      if (searchTerm) tableParams.search = searchTerm

      const [dashRes, chartRes, cashboxRes, tableRes, staffRes, pilotRes] = await Promise.all([
        mediaApi.getDashboard(dp),
        mediaApi.getDashboardChart(30),
        mediaApi.getCashbox(dp),
        mediaApi.getSales(tableParams),
        mediaApi.getStaffSummary(dp),
        mediaApi.getPilotSummary(dp),
      ])
      setDashboard(dashRes.data.data)
      setChart(chartRes.data.data)
      setCashbox(cashboxRes.data.data)
      setRows(tableRes.data.data)
      setPagination(tableRes.data.pagination)
      setStaffSummary(staffRes.data.data)
      setPilotSummary(pilotRes.data.data)
      setCurrentPage(page)
    } catch (e) { console.error('Fetch error:', e) }
    finally { setTableLoading(false) }
  }, [getDateParams, paymentFilter, deliveryFilter, searchTerm])

  useEffect(() => {
    setLoading(true)
    fetchAll(1).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading) fetchAll(1)
  }, [dateFilter, selectedDate, customStart, customEnd, paymentFilter, deliveryFilter, searchTerm])

  const handleDeliveryToggle = async (customerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'DELIVERED' ? 'READY' : 'DELIVERED'
    try {
      await mediaApi.updateDelivery(customerId, newStatus)
      await fetchAll(currentPage)
    } catch (e: any) {
      alert(e.response?.data?.message || e.response?.data?.error?.message || 'Teslim durumu güncellenemedi')
    }
  }

  const handleOpenFolder = async (customerId: string) => {
    try {
      const res = await mediaApi.openFolder(customerId)
      const smbPath = res.data?.data?.smbPath
      if (!smbPath) throw new Error('SMB path alınamadı')
      window.location.href = smbPath
    } catch (e: any) {
      alert(e.response?.data?.error?.message || e.message || 'Klasör açılamadı')
    }
  }

  const handleOpenPilotFolder = async (pilotId: string) => {
    try {
      const dp = getDateParams()
      const date = dp.date === 'custom' ? dp.startDate : undefined
      const res = await mediaApi.openPilotFolder(pilotId, date)
      const smbPath = res.data?.data?.smbPath
      if (!smbPath) throw new Error('SMB path alınamadı')
      window.location.href = smbPath
    } catch (e: any) {
      alert(e.response?.data?.error?.message || e.message || 'Klasör açılamadı')
    }
  }

  const formatTime = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`
  }

  const getDateLabel = () => {
    if (dateFilter === 'today') return 'Bugün'
    if (dateFilter === 'week') return 'Bu Hafta'
    if (dateFilter === 'month') return 'Bu Ay'
    if (dateFilter === 'custom' && customStart && customEnd) return `${customStart} — ${customEnd}`
    return 'Bugün'
  }

  // ====== CHANGE INDICATOR ======
  const ChangeIndicator = ({ value, label }: { value: number; label?: string }) => {
    if (value === 0) return <span className="text-xs text-muted-foreground">— {label || 'önceki'}</span>
    return (
      <span className={`text-xs flex items-center gap-0.5 ${value > 0 ? 'text-green-600' : 'text-red-500'}`}>
        {value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {value > 0 ? '+' : ''}{value}%
      </span>
    )
  }

  // ====== RENDER ======

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Foto/Video Raporu</h1>
            <p className="text-muted-foreground">Satışlar, teslimler ve performans analizi</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-white border rounded-lg px-2 py-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="text-sm border-0 bg-transparent focus:outline-none pr-1">
              <option value="today">Bugün</option>
              <option value="week">Bu Hafta</option>
              <option value="month">Bu Ay</option>
              <option value="custom">Özel Tarih</option>
            </select>
          </div>
          {dateFilter === 'today' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1.5 border rounded-lg text-sm"
            />
          )}
          {dateFilter === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 py-1.5 border rounded-lg text-sm" />
              <span className="text-muted-foreground text-sm">—</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 py-1.5 border rounded-lg text-sm" />
            </>
          )}
          <Link href="/admin/media/seller">
            <Button size="sm"><ShoppingBag className="h-4 w-4 mr-1.5" />Satış Paneli</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => fetchAll(currentPage)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ====== BÖLÜM 1: İSTATİSTİK KARTLARI ====== */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Camera className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold text-blue-700">{dashboard.todaySoldCount}</p>
              <p className="text-xs text-blue-600">Satılan</p>
              <ChangeIndicator value={dashboard.soldCountChange} />
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Banknote className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-700">€{dashboard.todayRevenue.toFixed(0)}</p>
              <p className="text-xs text-green-600">Kazanç</p>
              <ChangeIndicator value={dashboard.revenueChange} />
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <Truck className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
              <p className="text-2xl font-bold text-emerald-700">{dashboard.deliveredToday}</p>
              <p className="text-xs text-emerald-600">Teslim Edildi</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-700">{dashboard.waitingToday}</p>
              <p className="text-xs text-yellow-600">Bekliyor</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <p className="text-2xl font-bold text-purple-700">%{dashboard.saleRatio}</p>
              <p className="text-xs text-purple-600">Satış Oranı</p>
              <span className="text-xs text-muted-foreground">{dashboard.todaySoldCount}/{dashboard.todayFlights}</span>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-blue-100" />
              <p className="text-2xl font-bold">€{dashboard.monthTotal.toFixed(0)}</p>
              <p className="text-xs text-blue-100">Bu Ay Toplam</p>
              {dashboard.monthChange !== 0 && (
                <span className={`text-xs ${dashboard.monthChange > 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {dashboard.monthChange > 0 ? '↑' : '↓'}{Math.abs(dashboard.monthChange)}% geçen ay
                </span>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== BÖLÜM 2: GRAFİKLER + KASA (3 sütun) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Günlük Foto/Video Geliri (Son 30 Gün)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {chart ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.dailyData.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'revenue' ? `€${value.toFixed(0)}` : value,
                        name === 'revenue' ? 'Gelir' : 'Satış',
                      ]}
                      labelFormatter={(label: string) => new Date(label).toLocaleDateString('tr-TR')}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">Veri yok</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kasa Raporu — sabit kart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-600" />
              Kasa Raporu
              <span className="text-xs font-normal text-muted-foreground ml-auto">{getDateLabel()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!cashbox || cashbox.currencies.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">Ödeme kaydı yok</p>
            ) : (
              <div className="space-y-2">
                {cashbox.currencies.map((c) => (
                  <div key={c.currency} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm">{CURRENCY_SYMBOLS[c.currency] || c.currency} {c.currency}</span>
                      <span className="font-bold">{CURRENCY_SYMBOLS[c.currency]}{c.total.toFixed(2)}</span>
                    </div>
                    <div className="space-y-0.5">
                      {c.methods.map((m) => (
                        <div key={m.method} className="flex justify-between text-xs text-muted-foreground">
                          <span>{PAYMENT_LABELS[m.method] || m.method}</span>
                          <span>{CURRENCY_SYMBOLS[c.currency]}{m.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="bg-green-50 rounded-xl p-3 mt-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-green-800">Toplam Kazanç</span>
                    <span className="text-green-700 text-lg">€{cashbox.grandTotalEUR.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-0.5">{cashbox.saleCount} satış · Euro bazında</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== BÖLÜM 3: PERSONEL ÖZETİ ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Satış Personeli Özeti
            <span className="text-xs font-normal text-muted-foreground ml-auto">{getDateLabel()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staffSummary.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Satış kaydı yok</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="text-left py-2 px-2 font-medium">Personel</th>
                  <th className="text-center py-2 px-2 font-medium">Adet</th>
                  <th className="text-right py-2 px-2 font-medium">Toplam</th>
                  <th className="text-right py-2 px-2 font-medium">Ödenen</th>
                  <th className="text-right py-2 px-2 font-medium">Bekleyen</th>
                </tr>
              </thead>
              <tbody>
                {staffSummary.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 px-2 font-medium">{s.name}</td>
                    <td className="py-2 px-2 text-center">{s.count}</td>
                    <td className="py-2 px-2 text-right">€{s.totalEUR.toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-green-600">€{s.paidEUR.toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-red-500">{s.unpaidEUR > 0 ? `€${s.unpaidEUR.toFixed(0)}` : '—'}</td>
                  </tr>
                ))}
                {staffSummary.length > 1 && (
                  <tr className="bg-gray-50/80 font-semibold">
                    <td className="py-2 px-2">Toplam</td>
                    <td className="py-2 px-2 text-center">{staffSummary.reduce((s, x) => s + x.count, 0)}</td>
                    <td className="py-2 px-2 text-right">€{staffSummary.reduce((s, x) => s + x.totalEUR, 0).toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-green-600">€{staffSummary.reduce((s, x) => s + x.paidEUR, 0).toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-red-500">
                      {staffSummary.reduce((s, x) => s + x.unpaidEUR, 0) > 0 ? `€${staffSummary.reduce((s, x) => s + x.unpaidEUR, 0).toFixed(0)}` : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ====== BÖLÜM 4: PİLOT BAZLI MEDYA ÖZETİ ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Pilot Bazlı Medya Özeti
            <span className="text-xs font-normal text-muted-foreground ml-auto">{getDateLabel()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pilotSummary.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Uçuş kaydı yok</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="text-left py-2 px-2 font-medium">Pilot</th>
                  <th className="text-center py-2 px-2 font-medium">Uçuş</th>
                  <th className="text-center py-2 px-2 font-medium">Satılan</th>
                  <th className="text-center py-2 px-2 font-medium">Dosya</th>
                  <th className="text-center py-2 px-2 font-medium">Bekleyen</th>
                </tr>
              </thead>
              <tbody>
                {pilotSummary.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50/60 transition-colors">
                    <td className="py-2 px-2">
                      <button
                        onClick={() => handleOpenPilotFolder(p.id)}
                        className="flex items-center gap-1.5 font-medium hover:text-blue-600 transition-colors group"
                        title="Klasörü aç"
                      >
                        <FolderOpen className="h-4 w-4 text-blue-500 group-hover:text-blue-600" />
                        {p.name}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-center">{p.totalFlights}</td>
                    <td className="py-2 px-2 text-center text-green-600">{p.mediaSold}</td>
                    <td className="py-2 px-2 text-center">{p.filesUploaded}</td>
                    <td className="py-2 px-2 text-center">{p.waitingUpload > 0 ? <span className="text-yellow-600">{p.waitingUpload}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ====== BÖLÜM 5: FİLTRELER + MÜŞTERİ TABLOSU ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Müşteri Foto/Video Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri adı, QR kodu veya pilot..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
                <option value="all">Tüm Ödemeler</option>
                <option value="paid">Ödendi</option>
                <option value="unpaid">Ödenmedi</option>
              </select>
              <select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
                <option value="all">Tüm Teslimler</option>
                <option value="delivered">Teslim Edildi</option>
                <option value="waiting">Bekliyor</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {tableLoading ? (
            <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Kayıt bulunamadı</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/80">
                      <th className="text-left py-2.5 px-3 font-medium">#</th>
                      <th className="text-left py-2.5 px-3 font-medium">Müşteri</th>
                      <th className="text-left py-2.5 px-3 font-medium">Pilot</th>
                      <th className="text-left py-2.5 px-3 font-medium">Uçuş</th>
                      <th className="text-left py-2.5 px-3 font-medium">Paket</th>
                      <th className="text-left py-2.5 px-3 font-medium">Tutar</th>
                      <th className="text-left py-2.5 px-3 font-medium">Ödeme</th>
                      <th className="text-left py-2.5 px-3 font-medium">Teslim</th>
                      <th className="text-left py-2.5 px-3 font-medium">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.flightId} className="border-b hover:bg-gray-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground">{(currentPage - 1) * 20 + idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <button onClick={() => setSelectedRow(row)} className="text-left hover:text-primary transition-colors">
                            <p className="font-medium">{row.customer.firstName} {row.customer.lastName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{row.customer.displayId}</p>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-xs">{row.pilot.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs">{formatTime(row.flightTime)}</span>
                          {row.flightDuration && <span className="text-xs text-muted-foreground ml-1">({row.flightDuration}dk)</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.sale ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{row.sale.itemName}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Almadı</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.sale ? (
                            <div>
                              <span className="font-medium">
                                {CURRENCY_SYMBOLS[row.sale.primaryCurrency] || ''}{row.sale.totalPrice.toFixed(2)}
                              </span>
                              {row.sale.totalAmountEUR && row.sale.primaryCurrency !== 'EUR' && (
                                <span className="text-xs text-muted-foreground ml-1">(€{row.sale.totalAmountEUR.toFixed(0)})</span>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.sale?.paymentStatus === 'PAID' ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Ödendi</span>
                          ) : row.sale ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Ödenmedi</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.mediaFolder?.deliveryStatus === 'DELIVERED' ? (
                            <button onClick={() => handleDeliveryToggle(row.customer.id, 'DELIVERED')} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full hover:bg-green-200 transition-colors">
                              Teslim
                            </button>
                          ) : row.sale?.paymentStatus === 'PAID' ? (
                            <button onClick={() => handleDeliveryToggle(row.customer.id, 'READY')} className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full hover:bg-yellow-200 transition-colors">
                              Bekliyor
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Klasörü Aç"
                              onClick={() => handleOpenFolder(row.customer.id)}
                            >
                              <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                            <Link href={`/admin/customers/${row.customer.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Müşteri Detay">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {pagination.totalCount} kayıttan {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, pagination.totalCount)} arası
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => fetchAll(currentPage - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 py-1 text-sm">{currentPage} / {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={currentPage >= pagination.totalPages} onClick={() => fetchAll(currentPage + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ====== BÖLÜM 6: MÜŞTERİ DETAY MODALI ====== */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedRow(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{selectedRow.customer.firstName} {selectedRow.customer.lastName}</h3>
                <p className="text-sm text-muted-foreground font-mono">{selectedRow.customer.displayId}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedRow(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                {selectedRow.customer.phone && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />{selectedRow.customer.phone}
                  </span>
                )}
                {selectedRow.customer.email && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />{selectedRow.customer.email}
                  </span>
                )}
                {selectedRow.customer.weight && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Scale className="h-3.5 w-3.5" />{selectedRow.customer.weight} kg
                  </span>
                )}
              </div>

              {/* Flight Info */}
              <div className="bg-blue-50 rounded-xl p-3 space-y-1">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                  <Plane className="h-4 w-4" />Uçuş Bilgisi
                </h4>
                <div className="text-sm text-blue-700 space-y-0.5">
                  <p>Pilot: <span className="font-medium">{selectedRow.pilot.name}</span></p>
                  <p>
                    Saat: {formatTime(selectedRow.flightTime)}
                    {selectedRow.flightDuration && ` (${selectedRow.flightDuration} dk)`}
                  </p>
                  <p>Durum: {selectedRow.flightStatus === 'COMPLETED' ? 'Tamamlandı' : selectedRow.flightStatus === 'IN_FLIGHT' ? 'Uçuşta' : selectedRow.flightStatus}</p>
                </div>
              </div>

              {/* Sale Info */}
              {selectedRow.sale ? (
                <div className="bg-green-50 rounded-xl p-3 space-y-1">
                  <h4 className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                    <Camera className="h-4 w-4" />Foto/Video Satışı
                  </h4>
                  <div className="text-sm text-green-700 space-y-0.5">
                    <p>Paket: <span className="font-medium">{selectedRow.sale.itemName}</span></p>
                    <p>
                      Tutar: <span className="font-medium">
                        {CURRENCY_SYMBOLS[selectedRow.sale.primaryCurrency] || ''}{selectedRow.sale.totalPrice.toFixed(2)}
                      </span>
                      {selectedRow.sale.totalAmountEUR && selectedRow.sale.primaryCurrency !== 'EUR' && (
                        <span className="text-xs ml-1">(€{selectedRow.sale.totalAmountEUR.toFixed(2)})</span>
                      )}
                    </p>
                    <p>Ödeme: {selectedRow.sale.paymentStatus === 'PAID' ? 'Ödendi' : 'Ödenmedi'}
                      {selectedRow.sale.paymentMethod && ` — ${PAYMENT_LABELS[selectedRow.sale.paymentMethod] || selectedRow.sale.paymentMethod}`}
                    </p>
                    {selectedRow.sale.paymentDetails && selectedRow.sale.paymentDetails.length > 0 && (
                      <div className="mt-1 pl-2 border-l-2 border-green-300 space-y-0.5">
                        {selectedRow.sale.paymentDetails.map((pd, i) => (
                          <p key={pd.id || i} className="text-xs">
                            {PAYMENT_LABELS[pd.paymentMethod] || pd.paymentMethod}: {CURRENCY_SYMBOLS[pd.currency] || ''}{pd.amount.toFixed(2)}
                          </p>
                        ))}
                      </div>
                    )}
                    {selectedRow.sale.soldBy && (
                      <p>Satan: <span className="font-medium">{selectedRow.sale.soldBy.name || selectedRow.sale.soldBy.username}</span></p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-3 text-center text-sm text-muted-foreground">
                  Foto/Video satışı yapılmamış
                </div>
              )}

              {/* Delivery Status */}
              {selectedRow.mediaFolder && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <FolderOpen className="h-4 w-4" />Medya Klasörü
                  </h4>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>Dosya: {selectedRow.mediaFolder.fileCount} adet</p>
                    <p>Teslim: {selectedRow.mediaFolder.deliveryStatus === 'DELIVERED' ? 'Teslim Edildi' : selectedRow.mediaFolder.paymentStatus === 'PAID' ? 'Bekliyor' : '—'}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 text-sm"
                  onClick={() => { handleOpenFolder(selectedRow.customer.id); }}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />Klasörü Aç
                </Button>
                <Link href={`/admin/customers/${selectedRow.customer.id}`} className="flex-1">
                  <Button variant="outline" className="w-full text-sm">
                    <ExternalLink className="h-4 w-4 mr-2" />Müşteri Sayfası
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
