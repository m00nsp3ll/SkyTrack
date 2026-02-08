import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Display ID Generator
 * Format: 1 letter + 4 digits (e.g., A0001, A0002, ... A9999, B0001, ...)
 * Total capacity: 26 x 9999 = 259,974 customers
 */

export const displayIdService = {
  /**
   * Generate the next display ID
   * Finds the last used ID and increments it
   */
  async generateNext(): Promise<string> {
    // Get the last customer ordered by displayId
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { displayId: 'desc' },
      select: { displayId: true },
    });

    if (!lastCustomer) {
      // First customer ever
      return 'A0001';
    }

    return this.incrementId(lastCustomer.displayId);
  },

  /**
   * Increment a display ID to the next value
   * A0001 -> A0002, A9999 -> B0001, Z9999 -> error
   */
  incrementId(currentId: string): string {
    const letter = currentId.charAt(0);
    const number = parseInt(currentId.slice(1), 10);

    if (number < 9999) {
      // Just increment the number
      return `${letter}${String(number + 1).padStart(4, '0')}`;
    }

    // Number is 9999, need to go to next letter
    const nextLetterCode = letter.charCodeAt(0) + 1;

    if (nextLetterCode > 90) {
      // 'Z' is 90, we've exceeded it
      throw new Error('Display ID kapasitesi doldu! (Z9999 aşıldı)');
    }

    const nextLetter = String.fromCharCode(nextLetterCode);
    return `${nextLetter}0001`;
  },

  /**
   * Parse a display ID into its components
   */
  parse(displayId: string): { letter: string; number: number } {
    const letter = displayId.charAt(0).toUpperCase();
    const number = parseInt(displayId.slice(1), 10);
    return { letter, number };
  },

  /**
   * Validate a display ID format
   */
  isValid(displayId: string): boolean {
    if (!displayId || displayId.length !== 5) return false;
    const letter = displayId.charAt(0).toUpperCase();
    const numberPart = displayId.slice(1);

    // Letter must be A-Z
    if (letter < 'A' || letter > 'Z') return false;

    // Number part must be 4 digits, 0001-9999
    const num = parseInt(numberPart, 10);
    if (isNaN(num) || num < 1 || num > 9999) return false;
    if (numberPart.length !== 4) return false;

    return true;
  },

  /**
   * Generate display ID for a specific index (for seeding)
   * Index is 1-based: 1 -> A0001, 9999 -> A9999, 10000 -> B0001
   */
  fromIndex(index: number): string {
    if (index < 1 || index > 259974) {
      throw new Error('Index must be between 1 and 259974');
    }

    const letterIndex = Math.floor((index - 1) / 9999);
    const number = ((index - 1) % 9999) + 1;
    const letter = String.fromCharCode(65 + letterIndex); // 65 is 'A'

    return `${letter}${String(number).padStart(4, '0')}`;
  },
};

export default displayIdService;
