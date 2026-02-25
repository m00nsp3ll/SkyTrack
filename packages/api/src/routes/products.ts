import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { cache } from '../services/cache.js';

const router = Router();
const prisma = new PrismaClient();

// Product categories
const CATEGORIES = ['Rest', 'İçecek', 'Yiyecek', 'Hediyelik', 'Foto/Video', 'Diğer'];

// GET /api/products - List all products (with optional category filter)
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { category, activeOnly = 'true', favorites } = req.query;

  const where: any = {};

  // Active filter (default true for POS)
  if (activeOnly === 'true') {
    where.isActive = true;
  }

  // Category filter
  if (category && category !== 'all') {
    where.category = category;
  }

  // Favorites filter
  if (favorites === 'true') {
    where.isFavorite = true;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [
      { isFavorite: 'desc' },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });

  // Group by category for POS
  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = products.filter(p => p.category === cat);
    return acc;
  }, {} as Record<string, typeof products>);

  res.json({
    success: true,
    data: {
      products,
      grouped,
      categories: CATEGORIES,
    },
  });
}));

// GET /api/products/categories - Get category list
router.get('/categories', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  res.json({
    success: true,
    data: CATEGORIES,
  });
}));

// GET /api/products/favorites - Get favorite products for quick access
router.get('/favorites', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const favorites = await prisma.product.findMany({
    where: {
      isActive: true,
      isFavorite: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  res.json({
    success: true,
    data: favorites,
  });
}));

// GET /api/products/low-stock - Get products with low stock
router.get('/low-stock', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      stock: { not: null },
    },
  });

  // Filter products where stock is below alert threshold
  const lowStock = products.filter(p => {
    if (p.stock === null) return false;
    const threshold = p.lowStockAlert ?? 5;
    return p.stock <= threshold;
  });

  res.json({
    success: true,
    data: lowStock,
  });
}));

// GET /api/products/:id - Get single product
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new AppError('Ürün bulunamadı', 404, 'PRODUCT_NOT_FOUND');
  }

  res.json({
    success: true,
    data: product,
  });
}));

// POST /api/products - Create new product (admin only)
router.post('/', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { name, category, price, stock, lowStockAlert, imageUrl, isFavorite, sortOrder } = req.body;

  if (!name || !category || price === undefined) {
    throw new AppError('Ad, kategori ve fiyat zorunludur', 400, 'MISSING_FIELDS');
  }

  if (!CATEGORIES.includes(category)) {
    throw new AppError('Geçersiz kategori', 400, 'INVALID_CATEGORY');
  }

  const product = await prisma.product.create({
    data: {
      name,
      category,
      price: parseFloat(price),
      stock: stock ? parseInt(stock) : null,
      lowStockAlert: lowStockAlert ? parseInt(lowStockAlert) : null,
      imageUrl,
      isFavorite: isFavorite ?? false,
      sortOrder: sortOrder ?? 0,
    },
  });

  // Invalidate cache
  await cache.products.invalidate();

  res.status(201).json({
    success: true,
    data: product,
    message: 'Ürün eklendi',
  });
}));

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { name, category, price, stock, lowStockAlert, imageUrl, isFavorite, isActive, sortOrder } = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Ürün bulunamadı', 404, 'PRODUCT_NOT_FOUND');
  }

  if (category && !CATEGORIES.includes(category)) {
    throw new AppError('Geçersiz kategori', 400, 'INVALID_CATEGORY');
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      category: category ?? existing.category,
      price: price !== undefined ? parseFloat(price) : existing.price,
      stock: stock !== undefined ? (stock === null ? null : parseInt(stock)) : existing.stock,
      lowStockAlert: lowStockAlert !== undefined ? (lowStockAlert === null ? null : parseInt(lowStockAlert)) : existing.lowStockAlert,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      isFavorite: isFavorite !== undefined ? isFavorite : existing.isFavorite,
      isActive: isActive !== undefined ? isActive : existing.isActive,
      sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
    },
  });

  // Invalidate cache
  await cache.products.invalidate();

  res.json({
    success: true,
    data: product,
    message: 'Ürün güncellendi',
  });
}));

// PATCH /api/products/:id/toggle - Toggle active status
router.patch('/:id/toggle', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Ürün bulunamadı', 404, 'PRODUCT_NOT_FOUND');
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  // Invalidate cache
  await cache.products.invalidate();

  res.json({
    success: true,
    data: product,
    message: product.isActive ? 'Ürün aktif edildi' : 'Ürün pasif edildi',
  });
}));

// PATCH /api/products/:id/favorite - Toggle favorite status
router.patch('/:id/favorite', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Ürün bulunamadı', 404, 'PRODUCT_NOT_FOUND');
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isFavorite: !existing.isFavorite },
  });

  // Invalidate cache
  await cache.products.invalidate();

  res.json({
    success: true,
    data: product,
    message: product.isFavorite ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı',
  });
}));

// PATCH /api/products/:id/stock - Update stock
router.patch('/:id/stock', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { stock, adjustment } = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Ürün bulunamadı', 404, 'PRODUCT_NOT_FOUND');
  }

  let newStock: number | null = null;

  if (stock !== undefined) {
    // Direct stock set
    newStock = stock === null ? null : parseInt(stock);
  } else if (adjustment !== undefined) {
    // Relative adjustment (+5 or -3)
    const currentStock = existing.stock ?? 0;
    newStock = currentStock + parseInt(adjustment);
    if (newStock < 0) newStock = 0;
  }

  const product = await prisma.product.update({
    where: { id },
    data: { stock: newStock },
  });

  // Invalidate cache
  await cache.products.invalidate();

  res.json({
    success: true,
    data: product,
    message: `Stok güncellendi: ${newStock ?? 'Takip yok'}`,
  });
}));

// PATCH /api/products/:id/price - Quick price update
router.patch('/:id/price', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { price } = req.body;

  if (price === undefined || isNaN(parseFloat(price))) {
    throw new AppError('Geçerli bir fiyat girin', 400, 'INVALID_PRICE');
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Ürün bulunamadı', 404, 'PRODUCT_NOT_FOUND');
  }

  const product = await prisma.product.update({
    where: { id },
    data: { price: parseFloat(price) },
  });

  // Invalidate cache
  await cache.products.invalidate();

  res.json({
    success: true,
    data: product,
    message: `Fiyat güncellendi: ${price} TL`,
  });
}));

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Ürün bulunamadı', 404, 'PRODUCT_NOT_FOUND');
  }

  await prisma.product.delete({ where: { id } });

  // Invalidate cache
  await cache.products.invalidate();

  res.json({
    success: true,
    message: 'Ürün silindi',
  });
}));

export default router;
