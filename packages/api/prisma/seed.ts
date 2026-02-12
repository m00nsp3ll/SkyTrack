import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Helper: Generate display ID (A0001 format)
function generateDisplayId(index: number): string {
  if (index < 1 || index > 259974) {
    throw new Error('Index must be between 1 and 259974');
  }
  const letterIndex = Math.floor((index - 1) / 9999);
  const number = ((index - 1) % 9999) + 1;
  const letter = String.fromCharCode(65 + letterIndex); // 65 is 'A'
  return `${letter}${String(number).padStart(4, '0')}`;
}

// Helper: Random phone number
function randomPhone(): string {
  const prefixes = ['532', '533', '535', '536', '537', '538', '539', '542', '543', '544', '545', '546', '552', '553', '554', '555'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 9000000) + 1000000;
  return `05${prefix}${number}`;
}

// Turkish names database
const firstNames = [
  'Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Merve', 'Emine', 'Hatice', 'Büşra', 'Selin', 'Esra',
  'Deniz', 'Gizem', 'Ceren', 'Ece', 'Yağmur', 'İrem', 'Cansu', 'Melis', 'Duygu', 'Aslı',
  'Mehmet', 'Mustafa', 'Ahmet', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Osman', 'Yusuf', 'Murat',
  'Ömer', 'Emre', 'Burak', 'Serkan', 'Kemal', 'Can', 'Cem', 'Berk', 'Oğuz', 'Kaan',
  'Tolga', 'Onur', 'Arda', 'Barış', 'Sinan', 'Taner', 'Koray', 'Volkan', 'Erdem', 'Ufuk'
];

const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Koç',
  'Kurt', 'Özdemir', 'Aslan', 'Çetin', 'Kılıç', 'Yıldız', 'Özkan', 'Polat', 'Erdoğan', 'Korkmaz',
  'Özcan', 'Güneş', 'Aktaş', 'Yavuz', 'Aksoy', 'Karaca', 'Bulut', 'Tekin', 'Başar', 'Sezer'
];

// Pilot names (10 pilots)
const pilotNames = [
  'Ahmet Yılmaz', 'Mehmet Kaya', 'Ali Demir', 'Emre Çelik', 'Burak Şahin',
  'Serkan Aydın', 'Kemal Öztürk', 'Can Arslan', 'Oğuz Polat', 'Tolga Yavuz',
];

// Helper: Sanitize pilot name for folder path (Turkish chars -> ASCII)
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

async function main() {
  console.log('🌱 Seeding database with demo data...');
  console.log('');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.sale.deleteMany();
  await prisma.mediaFolder.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pilot.deleteMany();

  // =====================
  // 1. CREATE PILOTS (10)
  // =====================
  console.log('👨‍✈️ Creating 10 pilots...');

  const pilots: any[] = [];
  for (let i = 0; i < pilotNames.length; i++) {
    const name = pilotNames[i];
    const pilot = await prisma.pilot.create({
      data: {
        name: name,
        phone: `053${String(i + 10).padStart(2, '0')}${String(1000000 + i * 11111).slice(0, 7)}`,
        email: `${name.split(' ')[0].toLowerCase().replace(/[şğüöıçİ]/g, c =>
          ({ 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ı': 'i', 'ç': 'c', 'İ': 'i' }[c] || c)
        )}@skytrack.local`,
        queuePosition: i + 1,
        isActive: true,
        status: 'AVAILABLE',
        dailyFlightCount: 0,
        maxDailyFlights: 7,
      },
    });
    pilots.push(pilot);
  }
  console.log(`   ✅ Created ${pilots.length} pilots`);

  // =====================
  // 2. CREATE USERS (13 total)
  // =====================
  console.log('👤 Creating users...');

  const adminHash = await bcrypt.hash('admin123', 10);
  const pilotHash = await bcrypt.hash('pilot123', 10);
  const ofisHash = await bcrypt.hash('ofis123', 10);
  const medyaHash = await bcrypt.hash('medya123', 10);

  // Admin
  await prisma.user.create({
    data: { username: 'admin', passwordHash: adminHash, role: 'ADMIN' },
  });

  // Office staff
  await prisma.user.create({
    data: { username: 'ofis', passwordHash: ofisHash, role: 'OFFICE_STAFF' },
  });

  // Media seller
  await prisma.user.create({
    data: { username: 'medya', passwordHash: medyaHash, role: 'MEDIA_SELLER' },
  });

  // Pilot users (10)
  for (let i = 0; i < pilots.length; i++) {
    await prisma.user.create({
      data: {
        username: `pilot${i + 1}`,
        passwordHash: pilotHash,
        role: 'PILOT',
        pilotId: pilots[i].id,
      },
    });
  }
  console.log('   ✅ Created 13 users (1 admin, 1 office, 1 media, 10 pilots)');

  // =====================
  // 3. CREATE PRODUCTS (17)
  // =====================
  console.log('📦 Creating products...');

  await prisma.product.createMany({
    data: [
      // İçecekler
      { name: 'Kola', category: 'İçecek', price: 40, stock: 100, isActive: true, isFavorite: true, sortOrder: 1 },
      { name: 'Su', category: 'İçecek', price: 20, stock: 200, isActive: true, isFavorite: true, sortOrder: 2 },
      { name: 'Ayran', category: 'İçecek', price: 30, stock: 80, isActive: true, isFavorite: false, sortOrder: 3 },
      { name: 'Çay', category: 'İçecek', price: 25, stock: null, isActive: true, isFavorite: true, sortOrder: 4 },
      { name: 'Kahve', category: 'İçecek', price: 35, stock: null, isActive: true, isFavorite: false, sortOrder: 5 },
      { name: 'Meyve Suyu', category: 'İçecek', price: 45, stock: 60, isActive: true, isFavorite: false, sortOrder: 6 },
      // Yiyecekler
      { name: 'Tost', category: 'Yiyecek', price: 60, stock: 30, isActive: true, isFavorite: true, sortOrder: 7 },
      { name: 'Gözleme', category: 'Yiyecek', price: 70, stock: 25, isActive: true, isFavorite: true, sortOrder: 8 },
      { name: 'Sandviç', category: 'Yiyecek', price: 65, stock: 20, isActive: true, isFavorite: false, sortOrder: 9 },
      // Hediyelik
      { name: 'Magnet', category: 'Hediyelik', price: 50, stock: 150, isActive: true, isFavorite: false, sortOrder: 10 },
      { name: 'Anahtarlık', category: 'Hediyelik', price: 40, stock: 120, isActive: true, isFavorite: false, sortOrder: 11 },
      { name: 'Tişört', category: 'Hediyelik', price: 150, stock: 40, isActive: true, isFavorite: false, sortOrder: 12 },
      { name: 'Şapka', category: 'Hediyelik', price: 100, stock: 50, isActive: true, isFavorite: false, sortOrder: 13 },
      { name: 'Bardak', category: 'Hediyelik', price: 60, stock: 80, isActive: true, isFavorite: false, sortOrder: 14 },
      // Medya
      { name: 'Fotoğraf/Video Paketi', category: 'Medya', price: 500, stock: null, isActive: true, isFavorite: true, sortOrder: 15 },
      { name: 'Sadece Fotoğraf', category: 'Medya', price: 300, stock: null, isActive: true, isFavorite: false, sortOrder: 16 },
      { name: 'Sadece Video', category: 'Medya', price: 250, stock: null, isActive: true, isFavorite: false, sortOrder: 17 },
    ],
  });
  console.log('   ✅ Created 17 products');

  // =====================
  // 4. SIMULATE REAL QUEUE ROTATION
  // =====================
  // 10 pilots, customers come one by one.
  // Each customer is assigned to the first pilot in queue.
  // That pilot moves to the end of the queue.
  // This simulates a real day of operations.
  //
  // We'll create 25 customers total:
  //  - First 10: each pilot gets 1 customer (round 1, all completed)
  //  - Next 7: pilots 1-7 get a 2nd customer (round 2, completed)
  //  - Pilot 1 gets 5 more (total 7 = limit reached, all completed)
  //  - 3 more: assigned/in-flight for current state
  console.log('👥 Simulating queue rotation with customers...');

  const customers: any[] = [];
  const flights: any[] = [];
  let customerIndex = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];

  // Track queue as array of pilot indices - simulates real rotation
  const queue = pilots.map((_, i) => i); // [0,1,2,3,4,5,6,7,8,9]
  const pilotFlightCounts: number[] = new Array(10).fill(0);

  // Helper: assign next customer to first pilot in queue, move pilot to end
  async function assignCustomer(
    flightStatus: 'COMPLETED' | 'ASSIGNED' | 'IN_FLIGHT',
    flightHour: number,
  ) {
    const pilotIdx = queue.shift()!;
    queue.push(pilotIdx); // move to end of queue

    const pilot = pilots[pilotIdx];
    pilotFlightCounts[pilotIdx]++;
    const sortiNumber = pilotFlightCounts[pilotIdx];
    customerIndex++;

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    const customer = await prisma.customer.create({
      data: {
        displayId: generateDisplayId(customerIndex),
        firstName,
        lastName,
        phone: randomPhone(),
        weight: 55 + Math.floor(Math.random() * 45),
        status: flightStatus,
        waiverSigned: true,
        assignedPilotId: pilot.id,
      },
    });
    customers.push(customer);

    let flightData: any = {
      customerId: customer.id,
      pilotId: pilot.id,
      status: flightStatus,
    };

    if (flightStatus === 'COMPLETED') {
      const takeoffTime = new Date(today);
      takeoffTime.setHours(flightHour, Math.floor(Math.random() * 60), 0, 0);
      const duration = 12 + Math.floor(Math.random() * 14);
      const landingTime = new Date(takeoffTime.getTime() + duration * 60 * 1000);
      flightData.takeoffAt = takeoffTime;
      flightData.landingAt = landingTime;
      flightData.durationMinutes = duration;
      flightData.createdAt = new Date(takeoffTime.getTime() - 30 * 60 * 1000);
    } else if (flightStatus === 'IN_FLIGHT') {
      const now = new Date();
      const takeoffTime = new Date(now.getTime() - Math.floor(Math.random() * 10 + 3) * 60 * 1000);
      flightData.takeoffAt = takeoffTime;
      flightData.createdAt = new Date(takeoffTime.getTime() - 15 * 60 * 1000);
    }

    const flight = await prisma.flight.create({ data: flightData });
    flights.push(flight);

    // Create media folder
    const pilotFolderName = sanitizePilotName(pilot.name);
    const folderPath = `media/${dateStr}/${pilotFolderName}/${sortiNumber}_sorti/${customer.displayId}`;
    fs.mkdirSync(folderPath, { recursive: true });
    await prisma.mediaFolder.create({
      data: {
        customerId: customer.id,
        pilotId: pilot.id,
        flightId: flight.id,
        folderPath,
        fileCount: 0,
        paymentStatus: 'PENDING',
        paymentAmount: 500,
        deliveryStatus: flightStatus === 'COMPLETED' ? 'READY' : 'PENDING',
      },
    });

    return { pilot, customer, pilotIdx };
  }

  // --- Round 1: 10 customers, each pilot gets 1 (all completed) ---
  // Queue: [0,1,2,3,4,5,6,7,8,9] -> after round: [0,1,2,3,4,5,6,7,8,9] (full rotation)
  console.log('   Round 1: Her pilota 1 müşteri (tamamlandı)...');
  for (let i = 0; i < 10; i++) {
    await assignCustomer('COMPLETED', 8 + Math.floor(i * 0.5));
  }
  // After full rotation, queue is back to [0,1,2,3,4,5,6,7,8,9]

  // --- Round 2: 7 more customers (pilots 0-6 get 2nd flight, all completed) ---
  console.log('   Round 2: İlk 7 pilota 2. müşteri (tamamlandı)...');
  for (let i = 0; i < 7; i++) {
    await assignCustomer('COMPLETED', 10 + Math.floor(i * 0.5));
  }
  // After: queue is [7,8,9, 0,1,2,3,4,5,6]
  // Pilots 0-6 have 2 flights, pilots 7-9 have 1 flight

  // --- Pilot 0 (Ahmet Yılmaz) gets 5 more to reach limit (7 total) ---
  // We need to manually put pilot 0 at front of queue each time
  console.log('   Pilot 1 (Ahmet Yılmaz) limit dolduruluyor (7/7)...');
  for (let i = 0; i < 5; i++) {
    // Move pilot 0 to front of queue for this assignment
    const idx = queue.indexOf(0);
    queue.splice(idx, 1);
    queue.unshift(0);
    await assignCustomer('COMPLETED', 12 + i);
  }
  // Pilot 0 now has 7 flights = limit reached

  // --- 3 more active customers: 2 assigned, 1 in-flight ---
  console.log('   Aktif müşteriler oluşturuluyor...');
  // Remove pilot 0 from queue consideration (limit reached)
  const limitPilotIdx = queue.indexOf(0);
  if (limitPilotIdx !== -1) {
    queue.splice(limitPilotIdx, 1);
  }

  // Next in queue gets an IN_FLIGHT customer
  await assignCustomer('IN_FLIGHT', 14);

  // Next gets ASSIGNED
  await assignCustomer('ASSIGNED', 0);

  // Next gets IN_FLIGHT
  await assignCustomer('IN_FLIGHT', 14);

  console.log(`   ✅ Created ${customers.length} customers and ${flights.length} flights`);

  // =====================
  // 5. UPDATE PILOT STATS & QUEUE POSITIONS
  // =====================
  console.log('📊 Updating pilot statistics and queue positions...');

  // Set final queue positions based on the simulated queue order
  // queue array now has the correct order (without pilot 0 who hit limit)
  for (let i = 0; i < queue.length; i++) {
    const pilotIdx = queue[i];
    const pilot = pilots[pilotIdx];

    const totalFlights = await prisma.flight.count({
      where: { pilotId: pilot.id },
    });
    const inFlightCount = await prisma.flight.count({
      where: { pilotId: pilot.id, status: 'IN_FLIGHT' },
    });
    const assignedCount = await prisma.flight.count({
      where: { pilotId: pilot.id, status: 'ASSIGNED' },
    });

    let pilotStatus: 'AVAILABLE' | 'ASSIGNED' | 'IN_FLIGHT' = 'AVAILABLE';
    if (inFlightCount > 0) pilotStatus = 'IN_FLIGHT';
    else if (assignedCount > 0) pilotStatus = 'ASSIGNED';

    await prisma.pilot.update({
      where: { id: pilot.id },
      data: {
        dailyFlightCount: totalFlights,
        status: pilotStatus,
        queuePosition: i + 1,
      },
    });
  }

  // Limit reached pilot gets last position
  const limitPilot = pilots[0];
  const limitFlights = await prisma.flight.count({
    where: { pilotId: limitPilot.id },
  });
  await prisma.pilot.update({
    where: { id: limitPilot.id },
    data: {
      dailyFlightCount: limitFlights,
      status: 'AVAILABLE',
      queuePosition: queue.length + 1,
    },
  });

  // =====================
  // 6. CREATE SALES
  // =====================
  console.log('💰 Creating sales...');

  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (!adminUser) throw new Error('Admin user not found');

  const completedCustomers = customers.filter(c => c.status === 'COMPLETED');
  let salesCount = 0;

  // Media sales for some completed customers
  const mediaSaleCount = Math.min(10, completedCustomers.length);
  for (let i = 0; i < mediaSaleCount; i++) {
    const customer = completedCustomers[i];
    const isPaid = i < 7; // first 7 paid, rest unpaid

    await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: 'Fotoğraf/Video Paketi',
        itemType: 'Medya',
        quantity: 1,
        unitPrice: 500,
        totalPrice: 500,
        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
        paymentMethod: Math.random() > 0.5 ? 'CASH' : 'CREDIT_CARD',
      },
    });
    salesCount++;

    if (isPaid) {
      await prisma.mediaFolder.updateMany({
        where: { customerId: customer.id },
        data: { paymentStatus: 'PAID', deliveryStatus: 'DELIVERED' },
      });
    }
  }

  // POS sales
  const posProducts = [
    { name: 'Kola', type: 'İçecek', price: 40 },
    { name: 'Su', type: 'İçecek', price: 20 },
    { name: 'Çay', type: 'İçecek', price: 25 },
    { name: 'Tost', type: 'Yiyecek', price: 60 },
    { name: 'Gözleme', type: 'Yiyecek', price: 70 },
    { name: 'Magnet', type: 'Hediyelik', price: 50 },
  ];

  const paymentMethods: Array<'CASH' | 'CREDIT_CARD' | 'TRANSFER'> = ['CASH', 'CREDIT_CARD', 'TRANSFER'];

  for (let i = 0; i < 15; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = Math.floor(Math.random() * 3) + 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];

    await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: product.price * qty,
        paymentStatus: Math.random() < 0.8 ? 'PAID' : 'UNPAID',
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      },
    });
    salesCount++;
  }

  console.log(`   ✅ Created ${salesCount} sales records`);

  // =====================
  // 7. CREATE ROLE PERMISSIONS
  // =====================
  console.log('🔐 Creating default role permissions...');

  await prisma.rolePermission.deleteMany();

  const allItems = {
    '/admin': true, '/admin/customers/new': true, '/admin/scan': true, '/admin/customers': true, '/admin/flights': true,
    '/admin/pilots': true, '/admin/pilots/queue': true, '/admin/media': true, '/admin/media/seller': true,
    '/pos': true, '/admin/products': true, '/admin/sales/unpaid': true, '/admin/sales/daily': true,
    '/admin/reports/pilots': true, '/admin/reports/revenue': true, '/admin/reports/customers': true, '/admin/reports/compare': true,
    '/admin/notifications': true, '/admin/staff': true, '/admin/reports/system': true, '/admin/settings': true,
  };

  const allGroups = { GENEL: true, OPERASYON: true, PILOT_YONETIMI: true, MEDYA: true, SATIS: true, RAPORLAR: true, SISTEM: true };

  const rolePermsData = [
    { role: 'ADMIN' as const, permissions: { groups: allGroups, items: allItems } },
    { role: 'OFFICE_STAFF' as const, permissions: {
      groups: { GENEL: true, OPERASYON: true, PILOT_YONETIMI: true, MEDYA: true, SATIS: true, RAPORLAR: false, SISTEM: false },
      items: { ...allItems, '/admin/sales/daily': false, '/admin/reports/pilots': false, '/admin/reports/revenue': false, '/admin/reports/customers': false, '/admin/reports/compare': false, '/admin/notifications': false, '/admin/staff': false, '/admin/reports/system': false, '/admin/settings': false },
    }},
    { role: 'PILOT' as const, permissions: {
      groups: { GENEL: false, OPERASYON: false, PILOT_YONETIMI: false, MEDYA: false, SATIS: false, RAPORLAR: false, SISTEM: false },
      items: Object.fromEntries(Object.keys(allItems).map(k => [k, false])),
    }},
    { role: 'MEDIA_SELLER' as const, permissions: {
      groups: { GENEL: true, OPERASYON: false, PILOT_YONETIMI: false, MEDYA: true, SATIS: false, RAPORLAR: false, SISTEM: false },
      items: { ...Object.fromEntries(Object.keys(allItems).map(k => [k, false])), '/admin': true, '/admin/media': true, '/admin/media/seller': true },
    }},
    { role: 'CUSTOM' as const, permissions: {
      groups: { GENEL: true, OPERASYON: false, PILOT_YONETIMI: false, MEDYA: false, SATIS: false, RAPORLAR: false, SISTEM: false },
      items: { ...Object.fromEntries(Object.keys(allItems).map(k => [k, false])), '/admin': true },
    }},
  ];

  for (const rp of rolePermsData) {
    await prisma.rolePermission.create({ data: { role: rp.role, permissions: rp.permissions } });
  }

  console.log('   ✅ Created 5 role permission records');

  // =====================
  // PRINT FINAL QUEUE STATE
  // =====================
  const finalPilots = await prisma.pilot.findMany({
    where: { isActive: true },
    orderBy: { queuePosition: 'asc' },
    select: { name: true, queuePosition: true, dailyFlightCount: true, maxDailyFlights: true, status: true },
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 LOGIN CREDENTIALS:');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('   ADMIN:     admin / admin123');
  console.log('   OFFICE:    ofis / ofis123');
  console.log('   MEDIA:     medya / medya123');
  console.log('   PILOTS:    pilot1 / pilot123  →  pilot10 / pilot123');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('');
  console.log('📊 DATA SUMMARY:');
  console.log(`   • 10 Pilots (1 limit dolu: Ahmet Yılmaz)`);
  console.log(`   • 13 Users`);
  console.log(`   • 17 Products`);
  console.log(`   • ${customers.length} Customers`);
  console.log(`   • ${flights.length} Flights`);
  console.log(`   • ${salesCount} Sales`);
  console.log('');
  console.log('🔄 PILOT SIRASI (queuePosition):');
  console.log('───────────────────────────────────────────────────────────────');
  for (const p of finalPilots) {
    const isLimit = p.dailyFlightCount >= p.maxDailyFlights;
    const statusLabel = p.status === 'IN_FLIGHT' ? '✈️  Uçuşta' : p.status === 'ASSIGNED' ? '👤 Müşteri Atandı' : p.status === 'AVAILABLE' ? '✅ Müsait' : `⏸  ${p.status}`;
    const limitLabel = isLimit ? ' ❌ LİMİT' : '';
    console.log(`   ${p.queuePosition}. ${p.name.padEnd(20)} ${p.dailyFlightCount}/${p.maxDailyFlights}  ${statusLabel}${limitLabel}`);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
