import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

// Helper: Random time between hours (returns Date for today)
function randomTimeToday(startHour: number, endHour: number): Date {
  const today = new Date();
  const hour = startHour + Math.floor(Math.random() * (endHour - startHour));
  const minute = Math.floor(Math.random() * 60);
  today.setHours(hour, minute, 0, 0);
  return today;
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

// Pilot names (100 pilots)
const pilotNames = [
  'Ahmet Yılmaz', 'Mehmet Kaya', 'Ali Demir', 'Emre Çelik', 'Burak Şahin',
  'Serkan Aydın', 'Kemal Öztürk', 'Can Arslan', 'Oğuz Polat', 'Tolga Yavuz',
  'Murat Koç', 'Hasan Kurt', 'Hüseyin Özcan', 'Yusuf Güneş', 'Onur Aktaş',
  'Cem Aksoy', 'Berk Karaca', 'Kaan Bulut', 'Sinan Tekin', 'Arda Başar',
  'Volkan Sezer', 'Erdem Yıldız', 'Ufuk Özkan', 'Barış Erdoğan', 'Koray Korkmaz',
  'Taner Aslan', 'Deniz Çetin', 'Selim Kılıç', 'Fatih Doğan', 'Ozan Şen',
  'Alper Tunç', 'Erhan Başaran', 'Gökhan Yalçın', 'Uğur Akman', 'Caner Acar',
  'Halil Erdem', 'İlker Kara', 'Levent Eren', 'Mert Güler', 'Özgür Sönmez',
  'Rıza Taş', 'Soner Yıldırım', 'Tarık Çakır', 'Ümit Ateş', 'Veli Özer',
  'Yaşar Duman', 'Zafer Ay', 'Adem Kol', 'Bilal Tan', 'Cemal Işık',
  'Davut Bal', 'Erol Çam', 'Ferhat Dal', 'Gürkan Elmas', 'Harun Gök',
  'İsmail Kırmızı', 'Kadir Sarı', 'Latif Mavi', 'Muhammed Beyaz', 'Necati Mor',
  'Orhan Turuncu', 'Polat Pembe', 'Recep Gri', 'Sedat Lacivert', 'Teoman Bordo',
  'Utku Turkuaz', 'Vedat Eflatun', 'Yavuz Kahve', 'Zeki Krem', 'Adnan Bej',
  'Burhan Füme', 'Celal Antrasit', 'Doğan Cam', 'Engin Mercan', 'Ferit Yağız',
  'Görkem Çınar', 'Hayri Kavak', 'İlhan Meşe', 'Jale Söğüt', 'Korhan Ardıç',
  'Lütfi Defne', 'Mesut Zeytin', 'Nazım Fındık', 'Oktay Ceviz', 'Pınar Badem',
  'Rasim Kestane', 'Sabri Kayın', 'Tekin Huş', 'Umut Gürgen', 'Vedat Akasya',
  'Yakup Manolya', 'Ziya Lale', 'Arif Papatya', 'Bekir Menekşe', 'Cengiz Sümbül',
  'Dursun Nergis', 'Ersin Karanfil', 'Fırat Orkide', 'Güven Zambak', 'Hamza Yasemin',
];

async function main() {
  console.log('🌱 Seeding database with LARGE SCALE demo data...');
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
  // 1. CREATE PILOTS (100)
  // =====================
  console.log('👨‍✈️ Creating 100 pilots...');

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
  // 2. CREATE USERS (103 total)
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

  // Pilot users (100)
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
  console.log('   ✅ Created 103 users (1 admin, 1 office, 1 media, 100 pilots)');

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
  // 4. CREATE 100 CUSTOMERS & FLIGHTS
  // =====================
  console.log('👥 Creating 100 customers and flights...');

  // Status distribution: 40 COMPLETED, 20 IN_FLIGHT, 20 ASSIGNED, 15 REGISTERED, 5 CANCELLED
  const statusList: string[] = [
    ...Array(40).fill('COMPLETED'),
    ...Array(20).fill('IN_FLIGHT'),
    ...Array(20).fill('ASSIGNED'),
    ...Array(15).fill('REGISTERED'),
    ...Array(5).fill('CANCELLED'),
  ];

  // Shuffle for randomness but keep pilot assignment balanced
  const shuffledStatuses = statusList.sort(() => Math.random() - 0.5);

  const customers: any[] = [];
  const flights: any[] = [];
  const pilotFlightCounts = new Array(100).fill(0);

  // Track time slots for realistic scheduling (8:00-18:00)
  let currentHour = 8;
  let currentMinute = 0;
  let completedFlightIndex = 0;

  for (let i = 0; i < 100; i++) {
    const status = shuffledStatuses[i];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    // Find pilot with least flights (round-robin style)
    let assignedPilot = null;
    if (status !== 'REGISTERED' && status !== 'CANCELLED') {
      const minFlights = Math.min(...pilotFlightCounts);
      const pilotIndex = pilotFlightCounts.findIndex(c => c === minFlights);
      assignedPilot = pilots[pilotIndex];
      pilotFlightCounts[pilotIndex]++;
    }

    const customer = await prisma.customer.create({
      data: {
        displayId: generateDisplayId(i + 1),
        firstName: firstName,
        lastName: lastName,
        phone: randomPhone(),
        email: `${firstName.toLowerCase().replace(/[şğüöıçİ]/g, c =>
          ({ 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ı': 'i', 'ç': 'c', 'İ': 'i' }[c] || c)
        )}${i + 1}@example.com`,
        weight: 55 + Math.floor(Math.random() * 45),
        status: status,
        waiverSigned: status !== 'CANCELLED',
        assignedPilotId: assignedPilot?.id || null,
      },
    });
    customers.push(customer);

    // Create flight for customers with pilots
    if (assignedPilot && status !== 'REGISTERED' && status !== 'CANCELLED') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let flightData: any = {
        customerId: customer.id,
        pilotId: assignedPilot.id,
        status: status === 'COMPLETED' ? 'COMPLETED' : status === 'IN_FLIGHT' ? 'IN_FLIGHT' : 'ASSIGNED',
      };

      if (status === 'COMPLETED') {
        // Completed flights: spread throughout the day 08:00-16:00
        const takeoffHour = 8 + Math.floor(completedFlightIndex / 5); // ~5 flights per hour
        const takeoffMinute = (completedFlightIndex % 5) * 12; // every 12 minutes
        const takeoffTime = new Date(today);
        takeoffTime.setHours(takeoffHour, takeoffMinute, 0, 0);

        const duration = 12 + Math.floor(Math.random() * 14); // 12-25 minutes
        const landingTime = new Date(takeoffTime.getTime() + duration * 60 * 1000);

        flightData.takeoffAt = takeoffTime;
        flightData.landingAt = landingTime;
        flightData.durationMinutes = duration;
        flightData.createdAt = new Date(takeoffTime.getTime() - 30 * 60 * 1000); // 30 min before takeoff

        completedFlightIndex++;
      } else if (status === 'IN_FLIGHT') {
        // In-flight: took off recently (within last 10 minutes)
        const now = new Date();
        const takeoffTime = new Date(now.getTime() - Math.floor(Math.random() * 10) * 60 * 1000);
        flightData.takeoffAt = takeoffTime;
        flightData.createdAt = new Date(takeoffTime.getTime() - 15 * 60 * 1000);
      } else if (status === 'ASSIGNED') {
        // Assigned: waiting in queue
        flightData.createdAt = new Date();
      }

      const flight = await prisma.flight.create({ data: flightData });
      flights.push(flight);

      // Create media folder for completed flights
      if (status === 'COMPLETED') {
        const dateStr = today.toISOString().split('T')[0];
        await prisma.mediaFolder.create({
          data: {
            customerId: customer.id,
            pilotId: assignedPilot.id,
            flightId: flight.id,
            folderPath: `media/${dateStr}/pilot_${assignedPilot.id}/${customer.displayId}`,
            fileCount: 10 + Math.floor(Math.random() * 20),
            paymentStatus: 'PENDING',
            paymentAmount: 500,
            deliveryStatus: 'READY',
          },
        });
      }
    }
  }

  console.log(`   ✅ Created 100 customers and ${flights.length} flights`);

  // =====================
  // 5. CREATE SALES
  // =====================
  console.log('💰 Creating sales...');

  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (!adminUser) throw new Error('Admin user not found');

  const completedCustomers = customers.filter((_, i) => shuffledStatuses[i] === 'COMPLETED');
  let salesCount = 0;

  // Media sales for completed customers
  // 30 paid, 5 unpaid, 5 no media
  for (let i = 0; i < completedCustomers.length; i++) {
    const customer = completedCustomers[i];

    if (i < 30) {
      // 30 customers: media purchased and PAID
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          soldById: adminUser.id,
          itemName: 'Fotoğraf/Video Paketi',
          itemType: 'Medya',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
          paymentStatus: 'PAID',
          paymentMethod: Math.random() > 0.5 ? 'CASH' : 'CREDIT_CARD',
        },
      });
      salesCount++;

      // Update media folder payment status
      await prisma.mediaFolder.updateMany({
        where: { customerId: customer.id },
        data: { paymentStatus: 'PAID', deliveryStatus: 'DELIVERED' },
      });
    } else if (i < 35) {
      // 5 customers: media purchased but UNPAID
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          soldById: adminUser.id,
          itemName: 'Fotoğraf/Video Paketi',
          itemType: 'Medya',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
          paymentStatus: 'UNPAID',
          paymentMethod: 'CASH',
        },
      });
      salesCount++;
    }
    // Last 5 customers: no media purchase
  }

  // 60 POS sales (random products, random customers)
  const posProducts = [
    { name: 'Kola', type: 'İçecek', price: 40 },
    { name: 'Su', type: 'İçecek', price: 20 },
    { name: 'Ayran', type: 'İçecek', price: 30 },
    { name: 'Çay', type: 'İçecek', price: 25 },
    { name: 'Kahve', type: 'İçecek', price: 35 },
    { name: 'Tost', type: 'Yiyecek', price: 60 },
    { name: 'Gözleme', type: 'Yiyecek', price: 70 },
    { name: 'Sandviç', type: 'Yiyecek', price: 65 },
    { name: 'Magnet', type: 'Hediyelik', price: 50 },
    { name: 'Anahtarlık', type: 'Hediyelik', price: 40 },
    { name: 'Tişört', type: 'Hediyelik', price: 150 },
    { name: 'Şapka', type: 'Hediyelik', price: 100 },
  ];

  const paymentMethods: Array<'CASH' | 'CREDIT_CARD' | 'TRANSFER'> = ['CASH', 'CREDIT_CARD', 'TRANSFER'];

  for (let i = 0; i < 60; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = Math.floor(Math.random() * 3) + 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const isPaid = Math.random() < 0.8; // 80% paid

    await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: product.price * qty,
        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      },
    });
    salesCount++;
  }

  console.log(`   ✅ Created ${salesCount} sales records`);

  // =====================
  // UPDATE PILOT FLIGHT COUNTS
  // =====================
  console.log('📊 Updating pilot statistics...');

  for (let i = 0; i < pilots.length; i++) {
    const completedCount = await prisma.flight.count({
      where: { pilotId: pilots[i].id, status: 'COMPLETED' },
    });
    const inFlightCount = await prisma.flight.count({
      where: { pilotId: pilots[i].id, status: 'IN_FLIGHT' },
    });

    await prisma.pilot.update({
      where: { id: pilots[i].id },
      data: {
        dailyFlightCount: completedCount + inFlightCount,
        status: inFlightCount > 0 ? 'IN_FLIGHT' : 'AVAILABLE',
      },
    });
  }

  // =====================
  // SUMMARY
  // =====================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎉 LARGE SCALE SEED COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 LOGIN CREDENTIALS:');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('   ADMIN:');
  console.log('     • admin / admin123');
  console.log('');
  console.log('   OFFICE STAFF:');
  console.log('     • ofis / ofis123');
  console.log('');
  console.log('   MEDIA SELLER:');
  console.log('     • medya / medya123');
  console.log('');
  console.log('   PILOTS (100):');
  console.log('     • pilot1 / pilot123  →  pilot100 / pilot123');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('');
  console.log('📊 DATA SUMMARY:');
  console.log(`   • 100 Pilots (all active, all available)`);
  console.log(`   • 103 Users (1 admin, 1 office, 1 media, 100 pilots)`);
  console.log(`   • 17 Products`);
  console.log(`   • 100 Customers:`);
  console.log(`     - 40 COMPLETED (uçuş tamamlanmış)`);
  console.log(`     - 20 IN_FLIGHT (şu an havada)`);
  console.log(`     - 20 ASSIGNED (sırada bekliyor)`);
  console.log(`     - 15 REGISTERED (yeni kayıt)`);
  console.log(`     - 5 CANCELLED (iptal)`);
  console.log(`   • ${flights.length} Flights`);
  console.log(`   • ${salesCount} Sales (30 paid media, 5 unpaid media, 60 POS)`);
  console.log('');

  // Print pilot flight distribution (only pilots with flights)
  console.log('👨‍✈️ PILOTS WITH FLIGHTS:');
  for (let i = 0; i < pilots.length; i++) {
    const count = pilotFlightCounts[i];
    if (count > 0) {
      console.log(`   • ${pilotNames[i]}: ${count} flights`);
    }
  }
  console.log(`\n   📢 ${pilots.length - pilotFlightCounts.filter(c => c > 0).length} pilots are AVAILABLE with 0 flights`);
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
