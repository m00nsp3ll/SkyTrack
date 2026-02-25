'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { productsApi } from '@/lib/api'
import { ArrowLeft, Package, RefreshCw } from 'lucide-react'

const CATEGORIES = ['Rest', 'İçecek', 'Yiyecek', 'Hediyelik', 'Foto/Video', 'Diğer', 'VIDEO', 'PHOTO', 'PACKAGE', 'MERCH']

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    category: 'İçecek',
    price: '',
    stock: '',
    lowStockAlert: '',
    isFavorite: false,
    isActive: true,
  })

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await productsApi.getById(productId)
        const product = response.data.data
        setFormData({
          name: product.name,
          category: product.category,
          price: product.price.toString(),
          stock: product.stock?.toString() || '',
          lowStockAlert: product.lowStockAlert?.toString() || '',
          isFavorite: product.isFavorite,
          isActive: product.isActive,
        })
      } catch (err: any) {
        setError('Ürün bulunamadı')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await productsApi.update(productId, {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: formData.stock ? parseInt(formData.stock) : null,
        lowStockAlert: formData.lowStockAlert ? parseInt(formData.lowStockAlert) : null,
        isFavorite: formData.isFavorite,
        isActive: formData.isActive,
      })
      router.push('/admin/products')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ürün güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Ürün Düzenle</h1>
          <p className="text-muted-foreground">Ürün bilgilerini güncelleyin</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ürün Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Ürün Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Kola 330ml"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Fiyat (TL) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stok Adedi (Opsiyonel)</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="Takip yok"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowStockAlert">Düşük Stok Uyarısı</Label>
                <Input
                  id="lowStockAlert"
                  type="number"
                  value={formData.lowStockAlert}
                  onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFavorite"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isFavorite">Favorilere ekle (POS'ta hızlı erişim)</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive">Aktif (Satışa açık)</Label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Kaydet
              </Button>
              <Link href="/admin/products">
                <Button type="button" variant="outline">
                  İptal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
