'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { salesApi } from '@/lib/api'
import {
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Banknote,
  User,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  ShoppingCart,
} from 'lucide-react'

interface Sale {
  id: string
  itemName: string
  quantity: number
  totalPrice: number
  totalAmountEUR?: number
  createdAt: string
  soldBy: {
    id: string
    username: string
    name: string | null
  }
}

interface CustomerGroup {
  customer: {
    id: string | null
    displayId: string
    firstName: string
    lastName: string
  }
  sales: Sale[]
  total: number
  totalEUR?: number
}

export default function UnpaidSalesPage() {
  const [data, setData] = useState<{ customers: CustomerGroup[]; totalUnpaid: number; totalUnpaidEUR?: number; unpaidCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await salesApi.getUnpaid(dateFilter || undefined)
      setData(response.data.data)
    } catch (error) {
      console.error('Failed to fetch unpaid sales:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateFilter])

  const toggleExpand = (customerId: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(customerId)) {
        next.delete(customerId)
      } else {
        next.add(customerId)
      }
      return next
    })
  }

  const handlePaySingle = async (saleId: string, paymentMethod: 'CASH' | 'CREDIT_CARD') => {
    setProcessing(saleId)
    try {
      await salesApi.updatePayment(saleId, 'PAID', paymentMethod)
      fetchData()
    } catch (error) {
      console.error('Payment failed:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handlePayAll = async (customerId: string, paymentMethod: 'CASH' | 'CREDIT_CARD') => {
    setProcessing(customerId)
    try {
      await salesApi.bulkPay(customerId, paymentMethod)
      fetchData()
    } catch (error) {
      console.error('Bulk payment failed:', error)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ödenmemiş Satışlar</h1>
          <p className="text-muted-foreground">Veresiye ve bekleyen ödemeleri takip edin</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">€{(data.totalUnpaidEUR || data.totalUnpaid).toFixed(2)}</p>
              <p className="text-sm text-red-600">Toplam Borç</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{data.unpaidCount}</p>
              <p className="text-sm text-muted-foreground">Ödenmemiş Kalem</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Müşteri Bazında Borçlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !data || data.customers.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-green-600">Ödenmemiş satış yok</p>
              <p className="text-muted-foreground">Tüm ödemeler alınmış</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.customers.map((group) => {
                const customerId = group.customer.id || 'anonymous'
                const isExpanded = expandedCustomers.has(customerId)

                return (
                  <div key={customerId} className="border rounded-lg overflow-hidden">
                    {/* Customer Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(customerId)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <User className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">
                            {group.customer.firstName} {group.customer.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{group.customer.displayId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">€{(group.totalEUR || group.total).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{group.sales.length} kalem</p>
                        </div>
                        {group.customer.id && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Link href={`/pos?customer=${group.customer.displayId}`}>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Ödeme Al
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sales Details */}
                    {isExpanded && (
                      <div className="border-t">
                        {group.sales.map((sale) => (
                          <div
                            key={sale.id}
                            className="flex items-center justify-between p-3 border-b last:border-b-0"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{sale.itemName}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span>
                                  {new Date(sale.createdAt).toLocaleDateString('tr-TR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span>•</span>
                                <span>
                                  {new Date(sale.createdAt).toLocaleTimeString('tr-TR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {sale.quantity > 1 && (
                                  <>
                                    <span>•</span>
                                    <span>{sale.quantity} adet</span>
                                  </>
                                )}
                                {sale.soldBy && (
                                  <>
                                    <span>•</span>
                                    <span className="font-medium text-primary">
                                      {sale.soldBy.name || sale.soldBy.username}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-red-600">€{(sale.totalAmountEUR || sale.totalPrice).toFixed(2)}</span>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePaySingle(sale.id, 'CASH')}
                                  disabled={processing === sale.id}
                                >
                                  {processing === sale.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Banknote className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePaySingle(sale.id, 'CREDIT_CARD')}
                                  disabled={processing === sale.id}
                                >
                                  <CreditCard className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
