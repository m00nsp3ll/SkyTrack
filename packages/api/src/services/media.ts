import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MEDIA_BASE_PATH = process.env.MEDIA_STORAGE_PATH || './media';
const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_QUALITY = 80;

export interface MediaFile {
  filename: string;
  originalName: string;
  path: string;
  thumbnailPath?: string;
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

// Get media folder path for a customer
export function getMediaFolderPath(date: string, pilotId: string, customerDisplayId: string): string {
  return path.join(MEDIA_BASE_PATH, date, `pilot_${pilotId}`, `customer_${customerDisplayId}`);
}

// Ensure folder structure exists
export async function ensureFolderStructure(folderPath: string): Promise<void> {
  await fs.mkdir(path.join(folderPath, 'originals'), { recursive: true });
  await fs.mkdir(path.join(folderPath, 'thumbnails'), { recursive: true });
}

// Generate thumbnail for an image
export async function generateImageThumbnail(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await sharp(inputPath)
    .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toFile(outputPath);
}

// Generate thumbnail for a video (first frame)
export async function generateVideoThumbnail(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // Using ffmpeg for video thumbnails
  const ffmpeg = await import('fluent-ffmpeg');
  const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');

  ffmpeg.default.setFfmpegPath(ffmpegInstaller.path);

  return new Promise((resolve, reject) => {
    ffmpeg.default(inputPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: `${THUMBNAIL_WIDTH}x?`,
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });
}

// Determine file type from mime type
export function getFileType(mimeType: string): 'photo' | 'video' {
  if (mimeType.startsWith('video/')) return 'video';
  return 'photo';
}

// Scan folder for media files and generate thumbnails
export async function scanAndProcessFolder(
  folderPath: string,
  customerId: string,
  pilotId: string
): Promise<{ processed: number; errors: string[] }> {
  const originalsPath = path.join(folderPath, 'originals');
  const thumbnailsPath = path.join(folderPath, 'thumbnails');

  // Ensure folders exist
  await ensureFolderStructure(folderPath);

  let processed = 0;
  const errors: string[] = [];

  try {
    // Check if originals folder exists
    await fs.access(originalsPath);
  } catch {
    // If no originals folder, check root for files (GoPro direct copy)
    const rootFiles = await fs.readdir(folderPath);
    for (const file of rootFiles) {
      const filePath = path.join(folderPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile() && isMediaFile(file)) {
        // Move to originals folder
        await fs.rename(filePath, path.join(originalsPath, file));
      }
    }
  }

  // Now process originals folder
  try {
    const files = await fs.readdir(originalsPath);

    for (const file of files) {
      if (!isMediaFile(file)) continue;

      const filePath = path.join(originalsPath, file);
      const thumbnailName = getThumbnailName(file);
      const thumbnailPath = path.join(thumbnailsPath, thumbnailName);

      // Check if thumbnail already exists
      try {
        await fs.access(thumbnailPath);
        processed++;
        continue; // Already processed
      } catch {
        // Thumbnail doesn't exist, generate it
      }

      try {
        const mimeType = getMimeType(file);
        const fileType = getFileType(mimeType);

        if (fileType === 'photo') {
          await generateImageThumbnail(filePath, thumbnailPath);
        } else if (fileType === 'video') {
          await generateVideoThumbnail(filePath, thumbnailPath.replace(/\.[^.]+$/, '.jpg'));
        }

        processed++;
      } catch (err) {
        errors.push(`Failed to process ${file}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to read originals folder: ${(err as Error).message}`);
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

// Get thumbnail filename
function getThumbnailName(filename: string): string {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  return `${name}_thumb.jpg`;
}

// List all media files for a customer
export async function listMediaFiles(folderPath: string): Promise<MediaFile[]> {
  const originalsPath = path.join(folderPath, 'originals');
  const thumbnailsPath = path.join(folderPath, 'thumbnails');
  const files: MediaFile[] = [];

  try {
    const fileList = await fs.readdir(originalsPath);

    for (const filename of fileList) {
      if (!isMediaFile(filename)) continue;

      const filePath = path.join(originalsPath, filename);
      const stat = await fs.stat(filePath);
      const mimeType = getMimeType(filename);
      const thumbnailName = getThumbnailName(filename);

      // For videos, thumbnail has .jpg extension
      const actualThumbnailName = mimeType.startsWith('video/')
        ? thumbnailName.replace(/\.[^.]+$/, '.jpg')
        : thumbnailName;

      let thumbnailPath: string | undefined;
      try {
        await fs.access(path.join(thumbnailsPath, actualThumbnailName));
        thumbnailPath = path.join(thumbnailsPath, actualThumbnailName);
      } catch {
        // No thumbnail
      }

      files.push({
        filename,
        originalName: filename,
        path: filePath,
        thumbnailPath,
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
