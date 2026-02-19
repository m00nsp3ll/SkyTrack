import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MEDIA_BASE_PATH = process.env.MEDIA_STORAGE_PATH || './media';

export interface MediaFile {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  type: 'photo' | 'video';
  createdAt: Date;
}

export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  photos: number;
  videos: number;
}

// Sanitize pilot name for folder path (Turkish chars -> ASCII, spaces -> underscores)
export function sanitizePilotName(name: string): string {
  return name
    .replace(/[şŞ]/g, c => c === 'ş' ? 's' : 'S')
    .replace(/[ğĞ]/g, c => c === 'ğ' ? 'g' : 'G')
    .replace(/[üÜ]/g, c => c === 'ü' ? 'u' : 'U')
    .replace(/[öÖ]/g, c => c === 'ö' ? 'o' : 'O')
    .replace(/[ıİ]/g, c => c === 'ı' ? 'i' : 'I')
    .replace(/[çÇ]/g, c => c === 'ç' ? 'c' : 'C')
    .replace(/\s+/g, '_');
}

// Convert date to DD-MM-YYYY format for folder names
export function formatDateForFolder(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Get media folder path for a customer
// Structure: media/DD-MM-YYYY/Pilot_Name/X.Sorti/DisplayId/
export function getMediaFolderPath(date: string, pilotName: string, sortiNumber: number, customerDisplayId: string): string {
  const safePilotName = sanitizePilotName(pilotName);
  const folderDate = formatDateForFolder(date);
  return path.join(MEDIA_BASE_PATH, folderDate, safePilotName, `${sortiNumber}.Sorti`, customerDisplayId);
}

// Ensure folder structure exists (flat folder - files go directly here)
export async function ensureFolderStructure(folderPath: string): Promise<void> {
  await fs.mkdir(folderPath, { recursive: true });
}

// Determine file type from mime type
export function getFileType(mimeType: string): 'photo' | 'video' {
  if (mimeType.startsWith('video/')) return 'video';
  return 'photo';
}

// Recursively collect media files from a directory and all subdirectories
async function collectMediaFilesRecursive(dirPath: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await collectMediaFilesRecursive(fullPath);
        results.push(...subFiles);
      } else if (entry.isFile() && isMediaFile(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return results;
}

// Scan folder for media files (recursive - includes subdirectories like GoPro folders)
export async function scanAndProcessFolder(
  folderPath: string,
  customerId: string,
  pilotId: string
): Promise<{ processed: number; errors: string[] }> {
  // Ensure folder exists
  await ensureFolderStructure(folderPath);

  const errors: string[] = [];
  let processed = 0;

  try {
    const filePaths = await collectMediaFilesRecursive(folderPath);
    processed = filePaths.length;
  } catch (err) {
    errors.push(`Failed to read folder: ${(err as Error).message}`);
  }

  // Update MediaFolder record with file count and size
  await updateMediaFolderStats(folderPath, customerId);

  return { processed, errors };
}

// Check if file is a media file
function isMediaFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.webm'];
  return mediaExtensions.includes(ext);
}

// Get mime type from filename
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// List all media files for a customer (recursive - includes subdirectories like GoPro folders)
export async function listMediaFiles(folderPath: string): Promise<MediaFile[]> {
  const files: MediaFile[] = [];

  try {
    const filePaths = await collectMediaFilesRecursive(folderPath);

    for (const filePath of filePaths) {
      const filename = path.basename(filePath);
      const stat = await fs.stat(filePath);
      const mimeType = getMimeType(filename);

      files.push({
        filename,
        originalName: filename,
        path: filePath,
        size: stat.size,
        mimeType,
        type: getFileType(mimeType),
        createdAt: stat.birthtime,
      });
    }

    // Sort by creation time
    files.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  } catch (err) {
    // Folder doesn't exist or is empty
  }

  return files;
}

// Update MediaFolder stats in database
async function updateMediaFolderStats(folderPath: string, customerId: string): Promise<void> {
  const files = await listMediaFiles(folderPath);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  await prisma.mediaFolder.updateMany({
    where: { customerId },
    data: {
      fileCount: files.length,
      totalSizeBytes: totalSize,
    },
  });
}

// Get disk usage stats
export async function getDiskStats(): Promise<{
  total: number;
  used: number;
  free: number;
  mediaSize: number;
}> {
  let mediaSize = 0;

  async function getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          size += await getDirectorySize(filePath);
        } else {
          size += stat.size;
        }
      }
    } catch {
      // Directory doesn't exist
    }
    return size;
  }

  mediaSize = await getDirectorySize(MEDIA_BASE_PATH);

  // Note: Getting total disk space requires os-level calls
  // For now, return media size only
  return {
    total: 0, // Would need statvfs or similar
    used: 0,
    free: 0,
    mediaSize,
  };
}

// Get today's media stats
export async function getTodayMediaStats(): Promise<{
  uploaded: number;
  paid: number;
  delivered: number;
  pending: number;
  totalFiles: number;
  totalSize: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const folders = await prisma.mediaFolder.findMany({
    where: {
      createdAt: { gte: today },
    },
  });

  const uploaded = folders.length;
  const paid = folders.filter(f => f.paymentStatus === 'PAID').length;
  const delivered = folders.filter(f => f.deliveryStatus === 'DELIVERED').length;
  const pending = folders.filter(f => f.paymentStatus === 'PENDING').length;
  const totalFiles = folders.reduce((sum, f) => sum + f.fileCount, 0);
  const totalSize = folders.reduce((sum, f) => sum + f.totalSizeBytes, 0);

  return { uploaded, paid, delivered, pending, totalFiles, totalSize };
}
