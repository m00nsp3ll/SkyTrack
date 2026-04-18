'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { Building, ChevronDown, ChevronRight, Plane, Users, RefreshCw } from 'lucide-react'

interface FlightDetail {
  date: string
  duration: number
  customer: string
}

interface PilotData {
  id: string
  name: string
  queuePosition: number
  totalFlights: number
  realFlights: number
  forfeitCount: number
  roundCount: number
  flightFee: number
  hakedis: number
  totalPaid: number
  kalan: number
  flightDetails: FlightDetail[]
}

interface CompanyData {
  id: string
  name: string
  color: string
  pilotCount: number
  totalFlights: number
  totalRealFlights: number
  totalHakedis: number
  totalPaid: number
  totalKalan: number
  pilots: PilotData[]
}

export default function CompanyReportPage() {
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [expandedPilot, setExpandedPilot] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-03-01`
  })
  const [toDate, setToDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/reports/company?from=${fromDate}&to=${toDate}`)
      setCompanies(res.data.data.companies)
    } catch (err) {
      console.error('Firma raporu hatası:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [fromDate, toDate])

  const formatCurrency = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(v)
  const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const grandTotalFlights = companies.reduce((s, c) => s + c.totalFlights, 0)
  const grandTotalReal = companies.reduce((s, c) => s + c.totalRealFlights, 0)
  const grandTotalHakedis = companies.reduce((s, c) => s + c.totalHakedis, 0)
  const grandTotalPaid = companies.reduce((s, c) => s + c.totalPaid, 0)
  const grandTotalKalan = companies.reduce((s, c) => s + c.totalKalan, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Firma Raporu</h1>
          <p className="text-muted-foreground">{companies.length} firma, {companies.reduce((s, c) => s + c.pilotCount, 0)} pilot</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          <span className="text-muted-foreground">-</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Toplam Ucus</p>
            <p className="text-2xl font-bold">{grandTotalFlights}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Hakedis</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(grandTotalHakedis)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Odenen</p>
            <p className="text-2xl font-bold">{formatCurrency(grandTotalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Kalan</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(grandTotalKalan)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Firma Listesi */}
      <div className="space-y-3">
        {companies.filter(c => c.pilotCount > 0).map(company => {
          const isExpanded = expandedCompany === company.id
          return (
            <Card key={company.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedCompany(isExpanded ? null : company.id)}
                className="w-full text-left"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: company.color || '#6b7280' }}
                      >
                        {company.name}
                      </span>
                      <span className="text-sm text-muted-foreground">{company.pilotCount} pilot</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold">{company.totalFlights}</p>
                        <p className="text-[10px] text-muted-foreground">Ucus</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">{formatCurrency(company.totalHakedis)}</p>
                        <p className="text-[10px] text-muted-foreground">Hakedis</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-red-600">{formatCurrency(company.totalKalan)}</p>
                        <p className="text-[10px] text-muted-foreground">Kalan</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="pt-0 px-4 pb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="py-2 text-left">F#</th>
                        <th className="py-2 text-left">Pilot</th>
                        <th className="py-2 text-center">Ucus</th>
                        <th className="py-2 text-center">Feragat</th>
                        <th className="py-2 text-right">Hakedis</th>
                        <th className="py-2 text-right">Odenen</th>
                        <th className="py-2 text-right">Kalan</th>
                        <th className="py-2 text-center">Detay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.pilots.map(pilot => {
                        const isPilotExpanded = expandedPilot === pilot.id
                        return (
                          <>
                            <tr key={pilot.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 font-mono text-xs">{pilot.queuePosition}</td>
                              <td className="py-2 font-medium">{pilot.name}</td>
                              <td className="py-2 text-center">{pilot.totalFlights}</td>
                              <td className="py-2 text-center text-gray-500">{pilot.forfeitCount}</td>
                              <td className="py-2 text-right">{formatCurrency(pilot.hakedis)}</td>
                              <td className="py-2 text-right">{formatCurrency(pilot.totalPaid)}</td>
                              <td className={`py-2 text-right font-bold ${pilot.kalan < 0 ? 'text-blue-600' : pilot.kalan > 0 ? 'text-red-600' : ''}`}>
                                {formatCurrency(pilot.kalan)}
                              </td>
                              <td className="py-2 text-center">
                                {pilot.realFlights > 0 && (
                                  <button
                                    onClick={() => setExpandedPilot(isPilotExpanded ? null : pilot.id)}
                                    className="text-blue-500 hover:text-blue-700 text-xs"
                                  >
                                    {isPilotExpanded ? 'Gizle' : `${pilot.realFlights} ucus`}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isPilotExpanded && pilot.flightDetails.map((f, i) => (
                              <tr key={`${pilot.id}-${i}`} className="bg-blue-50 text-xs">
                                <td></td>
                                <td colSpan={2} className="py-1 pl-4 text-blue-700">{f.customer}</td>
                                <td className="py-1 text-center">{formatDate(f.date)}</td>
                                <td className="py-1 text-center">{formatTime(f.date)}</td>
                                <td className="py-1 text-right">{f.duration} dk</td>
                                <td colSpan={2}></td>
                              </tr>
                            ))}
                          </>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold text-sm">
                        <td colSpan={2} className="py-2">TOPLAM</td>
                        <td className="py-2 text-center">{company.totalFlights}</td>
                        <td className="py-2 text-center">{company.pilots.reduce((s, p) => s + p.forfeitCount, 0)}</td>
                        <td className="py-2 text-right">{formatCurrency(company.totalHakedis)}</td>
                        <td className="py-2 text-right">{formatCurrency(company.totalPaid)}</td>
                        <td className={`py-2 text-right ${company.totalKalan < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(company.totalKalan)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
