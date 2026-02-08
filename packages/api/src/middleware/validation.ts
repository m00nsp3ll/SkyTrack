import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

// Sanitize string input (prevent XSS)
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Sanitize object recursively
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

// Middleware to sanitize request body
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// Validate required fields
export function validateRequired(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing: string[] = [];

    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return next(new AppError(
        `Zorunlu alanlar eksik: ${missing.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      ));
    }

    next();
  };
}

// Validate phone number (Turkish format)
export function validatePhone(phone: string): boolean {
  // Turkish phone: 05XX XXX XX XX or +90 5XX XXX XX XX
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  return /^(\+90|0)?5\d{9}$/.test(cleaned);
}

// Validate email
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// File upload validation
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export function validateFileType(mimetype: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimetype);
}

// Sanitize filename (prevent path traversal)
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/\0/g, '')
    .replace(/[<>:"|?*]/g, '_');
}

// Rate limit error codes
export const RATE_LIMIT_CODES = {
  LOGIN: 'LOGIN_RATE_LIMIT',
  API: 'API_RATE_LIMIT',
  UPLOAD: 'UPLOAD_RATE_LIMIT',
};

// Common validation error messages (Turkish)
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Bu alan zorunludur',
  INVALID_PHONE: 'Geçersiz telefon numarası',
  INVALID_EMAIL: 'Geçersiz e-posta adresi',
  INVALID_FILE_TYPE: 'Desteklenmeyen dosya türü',
  FILE_TOO_LARGE: 'Dosya boyutu çok büyük (max 500MB)',
  UNAUTHORIZED: 'Oturum açmanız gerekiyor',
  FORBIDDEN: 'Bu işlem için yetkiniz yok',
  NOT_FOUND: 'Kayıt bulunamadı',
  DUPLICATE: 'Bu kayıt zaten mevcut',
  PILOT_UNAVAILABLE: 'Müsait pilot bulunamadı',
  PILOT_IN_FLIGHT: 'Pilot uçuşta, bu işlem yapılamaz',
  FLIGHT_NOT_EDITABLE: 'Bu uçuş düzenlenemez',
  PAYMENT_REQUIRED: 'Ödeme yapılmadan indirme yapılamaz',
};
