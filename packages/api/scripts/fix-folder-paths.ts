/**
 * One-time script: Fix media folder paths in DB from old UUID format to correct format.
 * Old: media/2026-03-21/pilot_<uuid>/customer_<displayId>
 * New: media/DD-MM-YYYY/Pilot_Name/X.Sorti/DisplayId
 *
 * Run: cd packages/api && npx ts-node --esm scripts/fix-folder-paths.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function sanitizePilotName(name: string): string {
  return name
    .replace(/[şŞ]/g, c => c === 'ş' ? 's' : 'S')
    .replace(/[ğĞ]/g, c => c === 'ğ' ? 'g' : 'G')
    .replace(/[üÜ]/g, c => c === 'ü' ? 'u' : 'U')
    .replace(/[öÖ]/g, c => c === 'ö' ? 'o' : 'O')
    .replace(/[ıİ]/g, c => c === 'ı' ? 'i' : 'I')
    .replace(/[çÇ]/g, c => c === 'ç' ? 'c' : 'C')
    .replace(/\s+/g, '_');
}

function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

async function main() {
  console.log('🔧 Fixing media folder paths...\n');

  // Load all media folders with their flight and pilot info
  const folders = await prisma.mediaFolder.findMany({
    include: {
      flight: {
        include: { pilot: true },
      },
      customer: { select: { displayId: true } },
    },
  });

  console.log(`Found ${folders.length} media folders to check.\n`);

  let fixed = 0;
  let skipped = 0;

  for (const folder of folders) {
    const flight = folder.flight;
    const pilot = flight?.pilot;
    const displayId = folder.customer.displayId;

    if (!flight || !pilot) {
      console.log(`  ⚠️  ${folder.id}: missing flight or pilot, skipping`);
      skipped++;
      continue;
    }

    // Calculate sorti number: count of this pilot's flights up to and including this one on the same day
    const flightDate = new Date(flight.createdAt);
    const dayStart = new Date(flightDate);
    dayStart.setHours(0, 0, 0, 0);

    const sortiNumber = await prisma.flight.count({
      where: {
        pilotId: pilot.id,
        createdAt: { gte: dayStart, lte: flight.createdAt },
      },
    });

    const dateStr = formatDateDDMMYYYY(flightDate);
    const pilotFolder = sanitizePilotName(pilot.name);
    const correctPath = `media/${dateStr}/${pilotFolder}/${sortiNumber}.Sorti/${displayId}`;

    if (folder.folderPath === correctPath) {
      skipped++;
      continue;
    }

    console.log(`  ✏️  ${displayId}`);
    console.log(`     OLD: ${folder.folderPath}`);
    console.log(`     NEW: ${correctPath}`);

    await prisma.mediaFolder.update({
      where: { id: folder.id },
      data: { folderPath: correctPath },
    });

    fixed++;
  }

  console.log(`\n✅ Done. Fixed: ${fixed}, Already correct / skipped: ${skipped}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
