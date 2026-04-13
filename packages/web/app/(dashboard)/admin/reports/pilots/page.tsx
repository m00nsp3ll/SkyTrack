'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  Award,
  AlertTriangle,
  CheckCircle,
  Settings,
  Crown,
} from 'lucide-react'
import { reportsApi, settingsApi } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PilotStats {
  id: string
  name: string
  tur: number
  totalFlights: number
  flightFee: number
  earnings: number
  forfeitCount: number
  isTeamLeader: boolean
  team?: { id: string; name: string; color: string } | null
  avgDuration: number
  totalCustomers: number
  avgDailyFlights: string
  cancelledFlights: number
  activeDays: number
  performanceScore: string
}

interface FairnessData {
  maxMinDiff: number
  standardDeviation: string
  balanceScore: string
}

interface ReportData {
  pilots: PilotStats[]
  currentRound: number
  globalFlightFee: number
  fairness: FairnessData
  dateRange: { from: string; to: string }
}

type QuickFilter = 'today' | 'week' | 'month' | 'custom'

function getQuickDates(filter: QuickFilter): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().split('T')[0]
  if (filter === 'today') {
    return { from: to, to }
  }
  if (filter === 'week') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return { from: d.toISOString().split('T')[0], to }
  }
  if (filter === 'month') {
    const d = new Date(today)
    d.setDate(1)
    return { from: d.toISOString().split('T')[0], to }
  }
  // custom — caller handles
  const d = new Date(today)
  d.setDate(d.getDate() - 30)
  return { from: d.toISOString().split('T')[0], to }
}

export default function PilotPerformanceReport() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month')
  const [dateFrom, setDateFrom] = useState(() => getQuickDates('month').from)
  const [dateTo, setDateTo] = useState(() => getQuickDates('month').to)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [editingPilotFee, setEditingPilotFee] = useState<{ id: string; name: string; fee: number } | null>(null)
  const [editingGlobalFee, setEditingGlobalFee] = useState<number | null>(null)
  const [feeInput, setFeeInput] = useState('')

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        setIsSuperAdmin(user.role === 'SUPER_ADMIN')
      }
    } catch {}
  }, [])

  const savePilotFee = async () => {
    if (!editingPilotFee) return
    const fee = feeInput === '' ? null : parseFloat(feeInput)
    try {
      await settingsApi.setPilotFee(editingPilotFee.id, fee)
      setEditingPilotFee(null)
      setFeeInput('')
      fetchData(dateFrom, dateTo)
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Pilotaj güncellenemedi')
    }
  }

  const saveGlobalFee = async () => {
    const fee = parseFloat(feeInput)
    if (isNaN(fee) || fee < 0) {
      alert('Geçerli bir tutar girin')
      return
    }
    try {
      await settingsApi.set('flightFee', fee)
      setEditingGlobalFee(null)
      setFeeInput('')
      fetchData(dateFrom, dateTo)
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Pilotaj güncellenemedi')
    }
  }

  const fetchData = async (from: string, to: string) => {
    setLoading(true)
    try {
      const res = await reportsApi.getPilots(from, to)
      setData(res.data.data)
    } catch (error) {
      console.error('Rapor hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(dateFrom, dateTo)
  }, [])

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter)
    if (filter !== 'custom') {
      const { from, to } = getQuickDates(filter)
      setDateFrom(from)
      setDateTo(to)
      fetchData(from, to)
    }
  }

  const handleFilter = () => {
    setQuickFilter('custom')
    fetchData(dateFrom, dateTo)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const balanceScore = parseFloat(data?.fairness.balanceScore || '0')
  const balanceStatus =
    balanceScore >= 80 ? 'excellent' : balanceScore >= 60 ? 'good' : 'poor'

  const flightChartData = data?.pilots.map((p) => ({
    name: p.name,
    flights: p.totalFlights,
    cancelled: p.cancelledFlights,
  })) || []

  const durationChartData = data?.pilots.map((p) => ({
    name: p.name,
    avgDuration: p.avgDuration,
  })) || []

  const quickButtons: { label: string; value: QuickFilter }[] = [
    { label: 'Bugün', value: 'today' },
    { label: 'Bu Hafta', value: 'week' },
    { label: 'Bu Ay', value: 'month' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pilot Performans Raporu</h1>
          <p className="text-muted-foreground">
            {data?.dateRange && (
              <>
                {formatDate(data.dateRange.from)} - {formatDate(data.dateRange.to)}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick filter buttons */}
          {quickButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={quickFilter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyQuickFilter(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
          <span className="text-muted-foreground text-sm">|</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setQuickFilter('custom') }}
            className="w-38"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setQuickFilter('custom') }}
            className="w-38"
          />
          <Button onClick={handleFilter}>Filtrele</Button>
        </div>
      </div>

      {/* Fairness Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={
            balanceStatus === 'excellent'
              ? 'border-green-200 bg-green-50'
              : balanceStatus === 'good'
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Denge Skoru</CardTitle>
            {balanceStatus === 'excellent' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : balanceStatus === 'good' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">%{data?.fairness.balanceScore || '0'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {balanceStatus === 'excellent'
                ? 'Mükemmel dağılım'
                : balanceStatus === 'good'
                ? 'İyi dağılım'
                : 'Dengesiz dağılım'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Max-Min Fark</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.fairness.maxMinDiff || 0}</p>
            <p className="text-xs text-muted-foreground">Uçuş farkı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Std. Sapma</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.fairness.standardDeviation || '0'}</p>
            <p className="text-xs text-muted-foreground">Uçuş dağılımı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Pilot</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.pilots.length || 0}</p>
            <p className="text-xs text-muted-foreground">Aktif pilot</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilot Bazında Uçuş Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            {flightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={flightChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="flights" fill="#3b82f6" name="Tamamlanan" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" fill="#ef4444" name="İptal" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ortalama Uçuş Süresi (dk)</CardTitle>
          </CardHeader>
          <CardContent>
            {durationChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={durationChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={12} width={80} />
                  <Tooltip formatter={(value: number) => `${value} dk`} />
                  <Bar dataKey="avgDuration" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tur + Global Pilotaj Bilgisi */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Mevcut Tur</p>
              <p className="text-3xl font-bold text-blue-700">{data?.currentRound || 0}</p>
            </div>
            <div className="border-l pl-6">
              <p className="text-xs text-muted-foreground">Global Pilotaj Ücreti</p>
              <p className="text-3xl font-bold text-green-700">₺{data?.globalFlightFee?.toLocaleString('tr-TR') || '1.000'}</p>
            </div>
          </div>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFeeInput(String(data?.globalFlightFee || 1000))
                setEditingGlobalFee(data?.globalFlightFee || 1000)
              }}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Pilotajı Belirle
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Pilot Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            Pilot Performans Tablosu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-sm">#</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Pilot</th>
                  <th className="text-center py-3 px-2 font-medium text-sm bg-blue-50">TUR</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Toplam Uçuş</th>
                  <th className="text-center py-3 px-2 font-medium text-sm bg-green-50">Pilotaj</th>
                  <th className="text-center py-3 px-2 font-medium text-sm bg-green-100">Kazanç</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Feragat</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Ort. Süre</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">İptal</th>
                </tr>
              </thead>
              <tbody>
                {data?.pilots.map((pilot, index) => (
                  <tr key={pilot.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      {index === 0 && <span className="text-yellow-500 text-lg">🥇</span>}
                      {index === 1 && <span className="text-gray-400 text-lg">🥈</span>}
                      {index === 2 && <span className="text-amber-600 text-lg">🥉</span>}
                      {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                    </td>
                    <td className="py-3 px-2 font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/reports/pilots/${pilot.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {pilot.name}
                        </Link>
                        {pilot.isTeamLeader && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                        {pilot.team && (
                          <Badge variant="outline" style={{ borderColor: pilot.team.color, color: pilot.team.color }}>
                            {pilot.team.name}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center bg-blue-50/40">
                      <span className="font-bold text-blue-700">{pilot.tur}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-bold text-gray-800">{pilot.totalFlights}</span>
                    </td>
                    <td className="py-3 px-2 text-center bg-green-50/40">
                      <div className="flex items-center justify-center gap-1">
                        <span>₺{pilot.flightFee.toLocaleString('tr-TR')}</span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setEditingPilotFee({ id: pilot.id, name: pilot.name, fee: pilot.flightFee })
                              setFeeInput(String(pilot.flightFee))
                            }}
                            className="text-blue-600 hover:text-blue-800 ml-1"
                            title="Pilotaj düzenle"
                          >
                            <Settings className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center bg-green-100/40 font-bold text-green-700">
                      ₺{pilot.earnings.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {pilot.forfeitCount > 0 ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {pilot.forfeitCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-muted-foreground">{pilot.avgDuration} dk</td>
                    <td className="py-3 px-2 text-center">
                      {pilot.cancelledFlights > 0 ? (
                        <Badge variant="destructive">{pilot.cancelledFlights}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-gray-50 font-bold">
                  <td colSpan={3} className="py-3 px-2 text-right">TOPLAM:</td>
                  <td className="py-3 px-2 text-center text-blue-700">
                    {data?.pilots.reduce((sum, p) => sum + p.totalFlights, 0)}
                  </td>
                  <td colSpan={1}></td>
                  <td className="py-3 px-2 text-center text-green-700">
                    ₺{data?.pilots.reduce((sum, p) => sum + p.earnings, 0).toLocaleString('tr-TR')}
                  </td>
                  <td className="py-3 px-2 text-center text-orange-700">
                    {data?.pilots.reduce((sum, p) => sum + p.forfeitCount, 0)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Global Pilotaj Modal */}
      {editingGlobalFee !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">Global Pilotaj Ücretini Belirle</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Bu ücret, kendi pilotajı belirlenmemiş tüm pilotlar için varsayılan olarak kullanılır.
            </p>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Tutar (TL)</label>
              <Input
                type="number"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                placeholder="1000"
                autoFocus
                className="text-lg"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEditingGlobalFee(null); setFeeInput('') }}>
                İptal
              </Button>
              <Button onClick={saveGlobalFee}>Kaydet</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pilot Bazlı Pilotaj Modal */}
      {editingPilotFee && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-1">{editingPilotFee.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pilot bazlı pilotaj ücreti. Boş bırakırsanız global ayar kullanılır.
            </p>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Tutar (TL)</label>
              <Input
                type="number"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                placeholder={`Global: ₺${data?.globalFlightFee || 1000}`}
                autoFocus
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Boş bırakıp kaydedersen global ücret ({`₺${data?.globalFlightFee || 1000}`}) kullanılır.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEditingPilotFee(null); setFeeInput('') }}>
                İptal
              </Button>
              <Button onClick={savePilotFee}>Kaydet</Button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Denge Skoru</h4>
              <p className="text-muted-foreground">
                Pilotlar arasındaki uçuş dağılımının ne kadar adil olduğunu gösterir.
                %80 üzeri mükemmel, %60-80 iyi, %60 altı dengesiz kabul edilir.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Standart Sapma</h4>
              <p className="text-muted-foreground">
                Pilotlar arasındaki uçuş sayısı farkının istatistiksel ölçümü.
                Düşük değer daha adil dağılım anlamına gelir.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performans Skoru</h4>
              <p className="text-muted-foreground">
                Günlük ortalama uçuş sayısı. 5+ mükemmel, 3-5 iyi, 3 altı düşük performans.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
