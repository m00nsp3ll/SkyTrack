import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create pilots
  const pilot1 = await prisma.pilot.create({
    data: {
      name: 'Ahmet Yılmaz',
      phone: '05321234567',
      email: 'ahmet@skytrack.local',
      queuePosition: 1,
      isActive: true,
      status: 'AVAILABLE',
    },
  });

  const pilot2 = await prisma.pilot.create({
    data: {
      name: 'Mehmet Kaya',
      phone: '05329876543',
      email: 'mehmet@skytrack.local',
      queuePosition: 2,
      isActive: true,
      status: 'AVAILABLE',
    },
  });

  const pilot3 = await prisma.pilot.create({
    data: {
      name: 'Ali Demir',
      phone: '05335551234',
      email: 'ali@skytrack.local',
      queuePosition: 3,
      isActive: true,
      status: 'AVAILABLE',
    },
  });

  console.log('✅ Created 3 pilots');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Created admin user (username: admin, password: admin123)');

  // Create pilot users
  const pilotPasswordHash = await bcrypt.hash('pilot123', 10);

  await prisma.user.create({
    data: {
      username: 'ahmet',
      passwordHash: pilotPasswordHash,
      role: 'PILOT',
      pilotId: pilot1.id,
    },
  });

  await prisma.user.create({
    data: {
      username: 'mehmet',
      passwordHash: pilotPasswordHash,
      role: 'PILOT',
      pilotId: pilot2.id,
    },
  });

  await prisma.user.create({
    data: {
      username: 'ali',
      passwordHash: pilotPasswordHash,
      role: 'PILOT',
      pilotId: pilot3.id,
    },
  });

  console.log('✅ Created 3 pilot users (password: pilot123)');

  // Create some sample products for POS
  await prisma.product.createMany({
    data: [
      { name: 'Fotoğraf Paketi', category: 'media', price: 500 },
      { name: 'Video Paketi', category: 'media', price: 750 },
      { name: 'Fotoğraf + Video Paketi', category: 'media', price: 1000 },
      { name: 'Su', category: 'beverage', price: 20 },
      { name: 'Kola', category: 'beverage', price: 35 },
      { name: 'Çay', category: 'beverage', price: 15 },
      { name: 'Anahtarlık', category: 'souvenir', price: 100 },
      { name: 'Tişört', category: 'souvenir', price: 250 },
    ],
  });

  console.log('✅ Created sample products');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   Admin: admin / admin123');
  console.log('   Pilots: ahmet / pilot123, mehmet / pilot123, ali / pilot123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
