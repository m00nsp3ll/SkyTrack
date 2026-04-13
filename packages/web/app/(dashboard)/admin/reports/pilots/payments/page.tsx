'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { settingsApi } from '@/lib/api'
import { ArrowLeft, Edit, Trash2, RefreshCw } from 'lucide-react'

interface Payment {
  id: string
  amount: string | number
  note: string | null
  createdAt: string
  periodFrom: string | null
  periodTo: string | null
  pilot: { id: string; name: string; company?: { name: string } | null }
  paidBy: { id: string; username: string; name: string | null }
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<Payment | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Payment | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const res = await settingsApi.getPayments()
      setPayments(res.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments() }, [])

  const openEdit = (p: Payment) => {
    setEditModal(p)
    setEditAmount(String(p.amount))
    setEditNote(p.note || '')
  }

  const saveEdit = async () => {
    if (!editModal) return
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount <= 0) { alert('Geçerli bir tutar girin'); return }
    setSaving(true)
    try {
      await settingsApi.updatePayment(editModal.id, { amount, note: editNote || undefined })
      setEditModal(null)
      fetchPayments()
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setSaving(true)
    try {
      await settingsApi.deletePayment(deleteConfirm.id)
      setDeleteConfirm(null)
      fetchPayments()
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Silinemedi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12"><RefreshCw className="h-8 w-8 animate-spin" /></div>
  }

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/reports/pilots" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Pilot Raporu'na Dön
          </Link>
          <h1 className="text-2xl font-bold">Ödeme Geçmişi</h1>
          <p className="text-sm text-muted-foreground">Toplam {payments.length} ödeme kaydı · ₺{totalAmount.toLocaleString('tr-TR')}</p>
        </div>
        <Button variant="outline" onClick={fetchPayments}>
          <RefreshCw className="h-4 w-4 mr-2" /> Yenile
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium">Tarih / Saat</th>
                  <th className="text-left py-3 px-3 font-medium">Pilot</th>
                  <th className="text-left py-3 px-3 font-medium">Firma</th>
                  <th className="text-right py-3 px-3 font-medium">Tutar</th>
                  <th className="text-left py-3 px-3 font-medium">Not</th>
                  <th className="text-left py-3 px-3 font-medium">Ödemeyi Yapan</th>
                  <th className="text-center py-3 px-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">
                      {new Date(p.createdAt).toLocaleString('tr-TR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3 font-medium">{p.pilot.name}</td>
                    <td className="py-2 px-3">
                      {p.pilot.company?.name || <span className="text-muted-foreground italic">-</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-green-700">
                      ₺{Number(p.amount).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{p.note || '-'}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">{p.paidBy.name || p.paidBy.username}</Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="h-7 px-2">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(p)} className="h-7 px-2 text-red-600 border-red-300 hover:bg-red-50">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Henüz ödeme kaydı yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-1">Ödemeyi Düzenle</h2>
            <p className="text-sm text-muted-foreground mb-4">{editModal.pilot.name}</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm font-medium">Tutar (TL)</label>
                <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium">Not</label>
                <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Açıklama..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditModal(null)} disabled={saving}>İptal</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-3 text-red-700">⚠️ Silme Onayı</h2>
            <p className="mb-1"><strong>{deleteConfirm.pilot.name}</strong> için yapılan</p>
            <p className="text-2xl font-bold text-green-700 mb-3">
              ₺{Number(deleteConfirm.amount).toLocaleString('tr-TR')}
            </p>
            <p className="text-sm text-red-600 mb-4">tutarındaki ödemeyi silmek istediğinize emin misiniz?</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={saving}>İptal</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={saving}>
                {saving ? 'Siliniyor...' : 'Evet, Sil'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
