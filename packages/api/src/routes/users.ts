import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

// Default permissions per role
const DEFAULT_PERMISSIONS: Record<string, any> = {
  ADMIN: {
    groups: { GENEL: true, OPERASYON: true, PILOT_YONETIMI: true, MEDYA: true, SATIS: true, RAPORLAR: true, SISTEM: true },
    items: {
      '/admin': true, '/admin/customers/new': true, '/admin/scan': true, '/admin/customers': true, '/admin/flights': true,
      '/admin/pilots': true, '/admin/pilots/queue': true, '/admin/media': true, '/admin/media/seller': true,
      '/pos': true, '/admin/products': true, '/admin/sales/unpaid': true, '/admin/sales/daily': true,
      '/admin/reports/pilots': true, '/admin/reports/revenue': true, '/admin/reports/customers': true, '/admin/reports/compare': true,
      '/admin/notifications': true, '/admin/staff': true, '/admin/reports/system': true, '/admin/settings': true,
    },
    posCategories: { 'Rest': true, 'İçecek': true, 'Yiyecek': true, 'Hediyelik': true, 'Foto/Video': true, 'Diğer': true },
  },
  OFFICE_STAFF: {
    groups: { GENEL: true, OPERASYON: true, PILOT_YONETIMI: true, MEDYA: true, SATIS: true, RAPORLAR: false, SISTEM: false },
    items: {
      '/admin': true, '/admin/customers/new': true, '/admin/scan': true, '/admin/customers': true, '/admin/flights': true,
      '/admin/pilots': true, '/admin/pilots/queue': true, '/admin/media': true, '/admin/media/seller': true,
      '/pos': true, '/admin/products': true, '/admin/sales/unpaid': true, '/admin/sales/daily': false,
      '/admin/reports/pilots': false, '/admin/reports/revenue': false, '/admin/reports/customers': false, '/admin/reports/compare': false,
      '/admin/notifications': false, '/admin/staff': false, '/admin/reports/system': false, '/admin/settings': false,
    },
    posCategories: { 'Rest': true, 'İçecek': true, 'Yiyecek': true, 'Hediyelik': false, 'Foto/Video': true, 'Diğer': false },
  },
  PILOT: {
    groups: { GENEL: false, OPERASYON: false, PILOT_YONETIMI: false, MEDYA: false, SATIS: false, RAPORLAR: false, SISTEM: false },
    items: {
      '/admin': false, '/admin/customers/new': false, '/admin/scan': false, '/admin/customers': false, '/admin/flights': false,
      '/admin/pilots': false, '/admin/pilots/queue': false, '/admin/media': false, '/admin/media/seller': false,
      '/pos': false, '/admin/products': false, '/admin/sales/unpaid': false, '/admin/sales/daily': false,
      '/admin/reports/pilots': false, '/admin/reports/revenue': false, '/admin/reports/customers': false, '/admin/reports/compare': false,
      '/admin/notifications': false, '/admin/staff': false, '/admin/reports/system': false, '/admin/settings': false,
    },
    posCategories: { 'Rest': false, 'İçecek': false, 'Yiyecek': false, 'Hediyelik': false, 'Foto/Video': false, 'Diğer': false },
  },
  MEDIA_SELLER: {
    groups: { GENEL: true, OPERASYON: false, PILOT_YONETIMI: false, MEDYA: true, SATIS: false, RAPORLAR: false, SISTEM: false },
    items: {
      '/admin': true, '/admin/customers/new': false, '/admin/scan': false, '/admin/customers': false, '/admin/flights': false,
      '/admin/pilots': false, '/admin/pilots/queue': false, '/admin/media': true, '/admin/media/seller': true,
      '/pos': false, '/admin/products': false, '/admin/sales/unpaid': false, '/admin/sales/daily': false,
      '/admin/reports/pilots': false, '/admin/reports/revenue': false, '/admin/reports/customers': false, '/admin/reports/compare': false,
      '/admin/notifications': false, '/admin/staff': false, '/admin/reports/system': false, '/admin/settings': false,
    },
    posCategories: { 'Rest': false, 'İçecek': false, 'Yiyecek': false, 'Hediyelik': false, 'Foto/Video': true, 'Diğer': false },
  },
  CUSTOM: {
    groups: { GENEL: true, OPERASYON: false, PILOT_YONETIMI: false, MEDYA: false, SATIS: false, RAPORLAR: false, SISTEM: false },
    items: {
      '/admin': true, '/admin/customers/new': false, '/admin/scan': false, '/admin/customers': false, '/admin/flights': false,
      '/admin/pilots': false, '/admin/pilots/queue': false, '/admin/media': false, '/admin/media/seller': false,
      '/pos': false, '/admin/products': false, '/admin/sales/unpaid': false, '/admin/sales/daily': false,
      '/admin/reports/pilots': false, '/admin/reports/revenue': false, '/admin/reports/customers': false, '/admin/reports/compare': false,
      '/admin/notifications': false, '/admin/staff': false, '/admin/reports/system': false, '/admin/settings': false,
    },
    posCategories: { 'Rest': false, 'İçecek': false, 'Yiyecek': false, 'Hediyelik': false, 'Foto/Video': false, 'Diğer': false },
  },
};

const router = Router();
const prisma = new PrismaClient();

// Helper: ensure all roles have a permission record
async function ensureDefaultPermissions() {
  const roles: UserRole[] = ['ADMIN', 'OFFICE_STAFF', 'PILOT', 'MEDIA_SELLER', 'CUSTOM'];
  for (const role of roles) {
    const existing = await prisma.rolePermission.findUnique({ where: { role } });
    if (!existing) {
      await prisma.rolePermission.create({
        data: { role, permissions: DEFAULT_PERMISSIONS[role] },
      });
    } else {
      // Backward compat: add posCategories if missing
      const perms = existing.permissions as any;
      if (!perms.posCategories) {
        const defaultPosCategories = DEFAULT_PERMISSIONS[role]?.posCategories;
        if (defaultPosCategories) {
          await prisma.rolePermission.update({
            where: { role },
            data: { permissions: { ...perms, posCategories: defaultPosCategories } },
          });
        }
      }
    }
  }
}

// ============ USER POS CATEGORIES ENDPOINTS ============

// GET /api/users/pos-categories - Get all users with their POS categories (for cashier tab)
router.get('/pos-categories', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const users = await prisma.user.findMany({
    where: { role: { in: ['OFFICE_STAFF', 'MEDIA_SELLER', 'CUSTOM'] } },
    orderBy: { username: 'asc' },
    select: {
      id: true, username: true, role: true, posCategories: true,
      pilot: { select: { name: true } },
    },
  });

  const result = users.map((u: any) => ({
    id: u.id,
    username: u.username,
    name: u.pilot?.name || u.username,
    role: u.role,
    posCategories: u.posCategories || null,
  }));

  res.json({ success: true, data: result });
}));

// PUT /api/users/pos-categories/:id - Update POS categories for a specific user
router.put('/pos-categories/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { posCategories } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { posCategories },
    select: { id: true, username: true, posCategories: true },
  });

  res.json({ success: true, data: updated, message: 'Kasiyer POS yetkileri güncellendi' });
}));

// ============ PERMISSIONS ENDPOINTS (must be before /:id) ============

// GET /api/users/permissions - Get all role permissions
router.get('/permissions', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  await ensureDefaultPermissions();
  const perms = await prisma.rolePermission.findMany({ orderBy: { role: 'asc' } });
  res.json({ success: true, data: perms });
}));

// GET /api/users/permissions/:role - Get permissions for a specific role
router.get('/permissions/:role', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const role = req.params.role as UserRole;
  await ensureDefaultPermissions();
  const perm = await prisma.rolePermission.findUnique({ where: { role } });
  if (!perm) {
    return res.json({ success: true, data: { role, permissions: DEFAULT_PERMISSIONS[role] || {} } });
  }
  res.json({ success: true, data: perm });
}));

// PUT /api/users/permissions/:role - Update permissions for a role
router.put('/permissions/:role', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const role = req.params.role as UserRole;
  const { permissions } = req.body;

  if (role === 'ADMIN') {
    throw new AppError('Admin rolünün yetkileri değiştirilemez', 400, 'CANNOT_MODIFY_ADMIN');
  }

  const perm = await prisma.rolePermission.upsert({
    where: { role },
    update: { permissions },
    create: { role, permissions },
  });

  res.json({ success: true, data: perm, message: 'Yetkiler güncellendi' });
}));

// ============ USER CRUD ENDPOINTS ============

// GET /api/users - List all users (admin only)
router.get('/', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { role } = req.query;
  const where: any = {};
  if (role && role !== 'all') {
    where.role = role;
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, username: true, role: true, pilotId: true, plainPassword: true,
      pilot: { select: { id: true, name: true } },
      createdAt: true, updatedAt: true,
    },
  });

  const usersWithDefaults = users.map((user: any) => ({
    ...user,
    name: user.pilot?.name || user.username,
    isActive: true,
    _count: { salesMade: 0, salesCollected: 0 },
  }));

  res.json({ success: true, data: usersWithDefaults });
}));

// GET /api/users/:id - Get user by ID
router.get('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, role: true, pilotId: true, plainPassword: true,
      pilot: { select: { id: true, name: true } },
      createdAt: true, updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: { ...user, name: (user as any).pilot?.name || user.username, isActive: true },
  });
}));

// POST /api/users - Create new user (admin only)
router.post('/', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { username, password, role, pilotId } = req.body;

  if (!username || !password || !role) {
    throw new AppError('Kullanıcı adı, şifre ve rol zorunludur', 400, 'MISSING_FIELDS');
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new AppError('Bu kullanıcı adı zaten kullanılıyor', 400, 'USERNAME_EXISTS');
  }

  const validRoles = ['ADMIN', 'OFFICE_STAFF', 'PILOT', 'MEDIA_SELLER', 'CUSTOM'];
  if (!validRoles.includes(role)) {
    throw new AppError('Geçersiz rol', 400, 'INVALID_ROLE');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash, plainPassword: password, role, pilotId: pilotId || null },
    select: { id: true, username: true, role: true, pilotId: true, plainPassword: true, createdAt: true },
  });

  res.status(201).json({ success: true, data: user, message: 'Kullanıcı oluşturuldu' });
}));

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { username, password, role, pilotId } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  if (username && username !== existing.username) {
    const usernameExists = await prisma.user.findUnique({ where: { username } });
    if (usernameExists) {
      throw new AppError('Bu kullanıcı adı zaten kullanılıyor', 400, 'USERNAME_EXISTS');
    }
  }

  const updateData: any = {};
  if (username) updateData.username = username;
  if (role) updateData.role = role;
  if (pilotId !== undefined) updateData.pilotId = pilotId || null;
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
    updateData.plainPassword = password;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, role: true, pilotId: true, plainPassword: true, updatedAt: true },
  });

  res.json({ success: true, data: user, message: 'Kullanıcı güncellendi' });
}));

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  if (id === req.user!.id) {
    throw new AppError('Kendi hesabınızı silemezsiniz', 400, 'CANNOT_DELETE_SELF');
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  const salesCount = await prisma.sale.count({ where: { soldById: id } });
  if (salesCount > 0) {
    throw new AppError(`Bu kullanıcının ${salesCount} satış kaydı var. Silemezsiniz.`, 400, 'USER_HAS_SALES');
  }

  await prisma.user.delete({ where: { id } });
  res.json({ success: true, message: 'Kullanıcı silindi' });
}));

export default router;
