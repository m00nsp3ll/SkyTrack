'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { productsApi } from '@/lib/api'
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Star,
  StarOff,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string
  price: number
  isActive: boolean
  isFavorite: boolean
  stock: number | null
  lowStockAlert: number | null
}

const CATEGORIES = ['İçecek', 'Yiyecek', 'Hediyelik', 'Foto/Video', 'Diğer']

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [newPrice, setNewPrice] = useState('')

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await productsApi.getAll({ activeOnly: 'false' })
      setProducts(response.data.data.products)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleToggle = async (id: string) => {
    try {
      await productsApi.toggle(id)
      fetchProducts()
    } catch (error) {
      console.error('Toggle failed:', error)
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      await productsApi.toggleFavorite(id)
      fetchProducts()
    } catch (error) {
      console.error('Toggle favorite failed:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    try {
      await productsApi.delete(id)
      fetchProducts()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const handlePriceUpdate = async (id: string) => {
    if (!newPrice) return
    try {
      await productsApi.updatePrice(id, parseFloat(newPrice))
      setEditingPrice(null)
      setNewPrice('')
      fetchProducts()
    } catch (error) {
      console.error('Price update failed:', error)
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const isLowStock = (p: Product) => {
    if (p.stock === null) return false
    return p.stock <= (p.lowStockAlert ?? 5)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ürün Kataloğu</h1>
          <p className="text-muted-foreground">POS için ürünleri yönetin</p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ürün
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Tüm Kategoriler</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchProducts}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ürünler ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Ürün bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Ürün Adı</th>
                    <th className="pb-3 font-medium">Kategori</th>
                    <th className="pb-3 font-medium text-right">Fiyat (TL)</th>
                    <th className="pb-3 font-medium text-center">Stok</th>
                    <th className="pb-3 font-medium text-center">Durum</th>
                    <th className="pb-3 font-medium text-center">Favori</th>
                    <th className="pb-3 font-medium text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className={`border-b ${!product.isActive ? 'opacity-50' : ''}`}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {isLowStock(product) && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {editingPrice === product.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              className="w-24 text-right"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePriceUpdate(product.id)
                                if (e.key === 'Escape') setEditingPrice(null)
                              }}
                            />
                            <Button size="sm" onClick={() => handlePriceUpdate(product.id)}>
                              ✓
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:text-primary font-medium"
                            onClick={() => {
                              setEditingPrice(product.id)
                              setNewPrice(product.price.toString())
                            }}
                          >
                            {product.price.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {product.stock !== null ? (
                          <span className={isLowStock(product) ? 'text-yellow-600 font-medium' : ''}>
                            {product.stock}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <button onClick={() => handleToggle(product.id)}>
                          {product.isActive ? (
                            <ToggleRight className="h-6 w-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 text-center">
                        <button onClick={() => handleToggleFavorite(product.id)}>
                          {product.isFavorite ? (
                            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <StarOff className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/products/${product.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
