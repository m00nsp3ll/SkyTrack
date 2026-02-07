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

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.token;

    if (!token) {
      throw new AppError('Oturum açmanız gerekiyor', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: UserRole;
      pilotId?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, role: true, pilotId: true },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 401, 'UNAUTHORIZED');
    }

    req.user = user;
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

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Bu işlem için yetkiniz yok', 403, 'FORBIDDEN'));
    }

    next();
  };
};

export const generateToken = (user: { id: string; role: UserRole; pilotId?: string | null }) => {
  return jwt.sign(
    { userId: user.id, role: user.role, pilotId: user.pilotId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};
