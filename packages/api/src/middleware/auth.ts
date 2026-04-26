import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppError } from './errorHandler.js';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    pilotId?: string | null;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'skytrack-dev-secret';

// Şifre hash'inden kısa bir versiyon türet (token geçersizleştirme için)
function passwordVersion(hash: string): string {
  return hash.slice(-8);
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.token || (req.query.token as string | undefined);

    if (!token) {
      throw new AppError('Oturum açmanız gerekiyor', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: UserRole;
      pilotId?: string;
      pv?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, role: true, pilotId: true, passwordHash: true },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 401, 'UNAUTHORIZED');
    }

    // Şifre değişmişse eski tokenları geçersiz kıl
    if (decoded.pv && decoded.pv !== passwordVersion(user.passwordHash)) {
      throw new AppError('Oturum süresi doldu, tekrar giriş yapın', 401, 'TOKEN_EXPIRED');
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      pilotId: user.pilotId,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Geçersiz oturum', 401, 'INVALID_TOKEN'));
    } else {
      next(error);
    }
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Oturum açmanız gerekiyor', 401, 'UNAUTHORIZED'));
    }

    // SUPER_ADMIN her yerde ADMIN yetkisine sahiptir
    const effectiveRoles = allowedRoles.includes('ADMIN')
      ? [...allowedRoles, 'SUPER_ADMIN' as UserRole]
      : allowedRoles;

    if (!effectiveRoles.includes(req.user.role)) {
      return next(new AppError('Bu işlem için yetkiniz yok', 403, 'FORBIDDEN'));
    }

    next();
  };
};

// Sadece SUPER_ADMIN erişebilir (Pilotaj ücreti gibi kritik ayarlar için)
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Oturum açmanız gerekiyor', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role !== 'SUPER_ADMIN') {
    return next(new AppError('Bu işlem sadece Süper Admin yetkisi gerektirir', 403, 'SUPER_ADMIN_REQUIRED'));
  }
  next();
};

export const generateToken = (user: { id: string; role: UserRole; pilotId?: string | null; passwordHash?: string }) => {
  const payload: any = { userId: user.id, role: user.role, pilotId: user.pilotId };
  if (user.passwordHash) {
    payload.pv = passwordVersion(user.passwordHash);
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};
