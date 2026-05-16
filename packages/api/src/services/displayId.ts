import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Display ID Generator
 * Yeni format: sadece rakam (1629, 1630, ...)
 * Eski format (T1628, A0001 vb.) geriye uyumlu çalışır
 */

export const displayIdService = {
  /**
   * Generate the next display ID — sadece rakam
   * Son kayıttaki en yüksek numarayı bulup +1 yapar
   */
  async generateNext(): Promise<string> {
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { displayId: true },
      take: 1,
    });

    if (!lastCustomer) return '1';

    // Eski veya yeni formattan numarayı çıkar
    const num = this.extractNumber(lastCustomer.displayId);
    return String(num + 1);
  },

  /**
   * displayId'den numarayı çıkar (T1628 → 1628, A0001 → 1, 1629 → 1629)
   */
  extractNumber(displayId: string): number {
    // Sadece rakam ise direkt parse et
    if (/^\d+$/.test(displayId)) return parseInt(displayId, 10);
    // Harf + rakam (T1628, A0001) → rakam kısmını al
    const num = parseInt(displayId.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Increment (geriye uyumluluk için)
   */
  incrementId(currentId: string): string {
    const num = this.extractNumber(currentId);
    return String(num + 1);
  },

  /**
   * Parse
   */
  parse(displayId: string): { letter: string; number: number } {
    const letter = /^[A-Z]/i.test(displayId) ? displayId.charAt(0).toUpperCase() : '';
    const number = this.extractNumber(displayId);
    return { letter, number };
  },

  /**
   * Validate — hem eski (T1628) hem yeni (1629) format geçerli
   */
  isValid(displayId: string): boolean {
    if (!displayId) return false;
    // Yeni format: sadece rakam
    if (/^\d+$/.test(displayId)) return true;
    // Eski format: harf + rakam
    if (/^[A-Z]\d{1,4}$/i.test(displayId)) return true;
    return false;
  },

  /**
   * fromIndex (seeding için)
   */
  fromIndex(index: number): string {
    return String(index);
  },
};

export default displayIdService;
