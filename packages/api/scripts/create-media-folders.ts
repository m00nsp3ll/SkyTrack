/**
 * One-time script: Create physical media folders for all DB records.
 * Run: cd packages/api && npx tsx scripts/create-media-folders.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('📁 Creating media folders for all DB records...\n');

  const folders = await prisma.mediaFolder.findMany({
    select: { folderPath: true },
  });

  console.log(`Found ${folders.length} media folders in DB.\n`);

  let created = 0;
  let existed = 0;

  for (const { folderPath } of folders) {
    if (fs.existsSync(folderPath)) {
      existed++;
    } else {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`  ✅ Created: ${folderPath}`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Already existed: ${existed}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
