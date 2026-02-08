import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

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
      id: true,
      username: true,
      role: true,
      pilotId: true,
      pilot: {
        select: { id: true, name: true },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  // Add default values for display
  const usersWithDefaults = users.map((user: any) => ({
    ...user,
    name: user.pilot?.name || user.username,
    isActive: true,
    _count: {
      salesMade: 0,
      salesCollected: 0,
    },
  }));

  res.json({
    success: true,
    data: usersWithDefaults,
  });
}));

// GET /api/users/:id - Get user by ID
router.get('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      role: true,
      pilotId: true,
      pilot: {
        select: { id: true, name: true },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: {
      ...user,
      name: (user as any).pilot?.name || user.username,
      isActive: true,
    },
  });
}));

// POST /api/users - Create new user (admin only)
router.post('/', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { username, password, role, pilotId } = req.body;

  if (!username || !password || !role) {
    throw new AppError('Kullanıcı adı, şifre ve rol zorunludur', 400, 'MISSING_FIELDS');
  }

  // Check if username exists
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new AppError('Bu kullanıcı adı zaten kullanılıyor', 400, 'USERNAME_EXISTS');
  }

  // Validate role
  const validRoles = ['ADMIN', 'OFFICE_STAFF', 'PILOT', 'MEDIA_SELLER'];
  if (!validRoles.includes(role)) {
    throw new AppError('Geçersiz rol', 400, 'INVALID_ROLE');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role,
      pilotId: pilotId || null,
    },
    select: {
      id: true,
      username: true,
      role: true,
      pilotId: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    success: true,
    data: user,
    message: 'Kullanıcı oluşturuldu',
  });
}));

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { username, password, role, pilotId } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  // Check username uniqueness if changed
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

  // Hash new password if provided
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      role: true,
      pilotId: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: user,
    message: 'Kullanıcı güncellendi',
  });
}));

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (id === req.user!.id) {
    throw new AppError('Kendi hesabınızı silemezsiniz', 400, 'CANNOT_DELETE_SELF');
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  // Check for sales linked to this user
  const salesCount = await prisma.sale.count({
    where: { soldById: id },
  });

  if (salesCount > 0) {
    throw new AppError(
      `Bu kullanıcının ${salesCount} satış kaydı var. Silemezsiniz.`,
      400,
      'USER_HAS_SALES'
    );
  }

  await prisma.user.delete({ where: { id } });

  res.json({
    success: true,
    message: 'Kullanıcı silindi',
  });
}));

export default router;
