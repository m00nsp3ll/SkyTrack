import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Default posCategories per role (for backward compat)
const DEFAULT_POS_CATEGORIES: Record<string, Record<string, boolean>> = {
  ADMIN: { 'Rest': true, 'İçecek': true, 'Yiyecek': true, 'Hediyelik': true, 'Foto/Video': true, 'Diğer': true },
  OFFICE_STAFF: { 'Rest': true, 'İçecek': true, 'Yiyecek': true, 'Hediyelik': false, 'Foto/Video': true, 'Diğer': false },
  PILOT: { 'Rest': false, 'İçecek': false, 'Yiyecek': false, 'Hediyelik': false, 'Foto/Video': false, 'Diğer': false },
  MEDIA_SELLER: { 'Rest': false, 'İçecek': false, 'Yiyecek': false, 'Hediyelik': false, 'Foto/Video': true, 'Diğer': false },
  CUSTOM: { 'Rest': false, 'İçecek': false, 'Yiyecek': false, 'Hediyelik': false, 'Foto/Video': false, 'Diğer': false },
};

// Ensure posCategories exists in permissions (backward compat)
function ensurePosCategories(permissions: any, role: string): any {
  if (!permissions) return permissions;
  if (!permissions.posCategories) {
    return { ...permissions, posCategories: DEFAULT_POS_CATEGORIES[role] || DEFAULT_POS_CATEGORIES.CUSTOM };
  }
  return permissions;
}

// POST /api/auth/login
router.post('/login', asyncHandler(async (req: AuthRequest, res: any) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new AppError('Kullanıcı adı ve şifre gerekli', 400, 'MISSING_CREDENTIALS');
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { pilot: true },
  });

  if (!user) {
    throw new AppError('Geçersiz kullanıcı adı veya şifre', 401, 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError('Geçersiz kullanıcı adı veya şifre', 401, 'INVALID_CREDENTIALS');
  }

  const token = generateToken({ ...user, passwordHash: user.passwordHash });

  // Set HTTP-only cookie as backup auth mechanism
  res.cookie('token', token, {
    httpOnly: false, // Allow JS access so Capacitor can read it
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });

  // Get role permissions
  const rolePerm = await prisma.rolePermission.findUnique({ where: { role: user.role } });

  // User-level posCategories override role-level
  let permissions = ensurePosCategories(rolePerm?.permissions || null, user.role);
  if (user.posCategories) {
    permissions = { ...permissions, posCategories: user.posCategories };
  }

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        pilotId: user.pilotId,
        pilotName: user.pilot?.name || null,
      },
      permissions,
    },
  });
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pilot: true },
  });

  if (!user) {
    throw new AppError('Kullanıcı bulunamadı', 404, 'USER_NOT_FOUND');
  }

  const rolePerm = await prisma.rolePermission.findUnique({ where: { role: user.role } });

  // User-level posCategories override role-level
  let mePermissions = ensurePosCategories(rolePerm?.permissions || null, user.role);
  if (user.posCategories) {
    mePermissions = { ...mePermissions, posCategories: user.posCategories };
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      pilotId: user.pilotId,
      pilotName: user.pilot?.name || null,
      permissions: mePermissions,
    },
  });
}));

// POST /api/auth/register (admin only - for creating new users)
router.post('/register', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  if (req.user!.role !== 'ADMIN') {
    throw new AppError('Bu işlem için yetkiniz yok', 403, 'FORBIDDEN');
  }

  const { username, password, role, pilotId } = req.body;

  if (!username || !password || !role) {
    throw new AppError('Kullanıcı adı, şifre ve rol gerekli', 400, 'MISSING_FIELDS');
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new AppError('Bu kullanıcı adı zaten kullanılıyor', 400, 'USERNAME_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role,
      pilotId: pilotId || null,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
}));

export default router;
