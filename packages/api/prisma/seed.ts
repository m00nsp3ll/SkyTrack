import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

// Turkish names database (for customers)
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

// Real pilot list — Harun 1. sıra, Bedirhan 2. sıra
const pilotNames = [
  'HARUN SİVASLI',
  'BEDİRHAN ÇELİK',
  'MİRZA TAYLAN',
  'TUNAHAN OĞUZ',
  'HASAN HÜSEYİN IŞIK',
  'TUGAY KARATEKE',
  'TOLGA YILDIRIM',
  'MURAT ARIKAN',
  'SERKAN YILMAZOĞLU',
  'BAHADIR A. YALÇIN',
  'ERGUN ULU',
  'A.SEHA KARADUMAN',
  'ABDULLAH AYTEN',
  'HASAN KARATEKE',
  'HALİL KARATEKE',
  'YÜCEL ALBAYRAK',
  'BARIŞ KORKMAZ',
  'HAMİT ŞEK',
  'HARUN KARATEKE',
  'MUHSİN KARATEKE',
  'YİĞİT O. GÜNEŞTEN',
  'ONUR BURAK AVCI',
  'SEDAT NARKUZ',
  'SEDAT KÖKSAL',
  'ESRA OLGAÇ',
  'KERİM SARIGÜL',
  'BÜNYAMİN ÖZİL',
  'MUSTAFA KİPEL',
  'ÖZLEM BAĞ ÖZGÜÇ',
  'ALİ YALÇIN',
  'BAHADIR AKTAŞ',
  'KADİR TORBALI',
  'MEHMET ERMETİN',
  'EMRE GÜNGÖR',
  'CEM IŞIK',
  'EMRE ELKAP',
  'FURKAN ŞİMŞEK',
  'ZEYNEP KOÇAK',
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

// Helper: Generate username from pilot name
function pilotUsername(name: string, index: number): string {
  const parts = name.toLowerCase().split(/\s+/);
  let username = parts[0]
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o').replace(/[ıİ]/g, 'i').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]/g, '');
  return `pilot${index + 1}`;
}

async function main() {
  console.log('🌱 Seeding database with demo data...');
  console.log('');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.paymentDetail.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.exchangeRateHistory.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.mediaFolder.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.fcmToken.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pilot.deleteMany();

  // Clean media folders
  const MEDIA_STORAGE_PATH = process.env.MEDIA_STORAGE_PATH || './media';
  try {
    if (fs.existsSync(MEDIA_STORAGE_PATH)) {
      const entries = fs.readdirSync(MEDIA_STORAGE_PATH);
      for (const entry of entries) {
        const entryPath = path.join(MEDIA_STORAGE_PATH, entry);
        if (entry !== '.gitkeep') {
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      }
      console.log('   ✅ Media folders cleaned');
    }
  } catch (error) {
    console.log('   ⚠️  Media folder cleanup skipped:', error);
  }

  // =====================
  // 1. CREATE PILOTS (37)
  // =====================
  console.log(`👨‍✈️ Creating ${pilotNames.length} pilots...`);

  const pilots: any[] = [];

  // Harun ve Bedirhan — özel bilgilerle
  const specialPilots = [
    { name: 'HARUN SİVASLI', phone: '05073455838', email: 'harunsivasli@gmail.com' },
    { name: 'BEDİRHAN ÇELİK', phone: '+905537214251', email: null },
  ];

  for (let i = 0; i < pilotNames.length; i++) {
    const name = pilotNames[i];
    const special = specialPilots.find(s => s.name === name);
    const pilot = await prisma.pilot.create({
      data: {
        name: name,
        phone: special?.phone ?? `053${String(i + 10).padStart(2, '0')}${String(1000000 + i * 11111).slice(0, 7)}`,
        email: special?.email ?? null,
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
  // 2. CREATE USERS
  // =====================
  console.log('👤 Creating users...');

  const adminHash = await bcrypt.hash('admin123', 10);
  const pilotHash = await bcrypt.hash('pilot123', 10);
  const ofisHash = await bcrypt.hash('ofis123', 10);
  const medyaHash = await bcrypt.hash('medya123', 10);
  const harunHash = await bcrypt.hash('12345', 10);
  const bedoHash = await bcrypt.hash('12345', 10);
  const harunStaffHash = await bcrypt.hash('harun123', 10);

  // Admin
  await prisma.user.create({
    data: { username: 'admin', passwordHash: adminHash, role: 'ADMIN', name: 'Admin' },
  });

  // Office staff
  await prisma.user.create({
    data: { username: 'ofis', passwordHash: ofisHash, role: 'OFFICE_STAFF', name: 'Ofis' },
  });

  // Media seller
  await prisma.user.create({
    data: { username: 'medya', passwordHash: medyaHash, role: 'MEDIA_SELLER', name: 'Medya' },
  });

  // Harun - satış personeli
  const harunStaffUser = await prisma.user.create({
    data: { username: 'harun', passwordHash: harunStaffHash, role: 'OFFICE_STAFF', name: 'Harun' },
  });

  // Pilot users — Harun ve Bedirhan özel hesaplarla, diğerleri pilot1..N
  for (let i = 0; i < pilots.length; i++) {
    const name = pilotNames[i];
    let username: string;
    let hash: string;

    if (name === 'HARUN SİVASLI') {
      username = 'Harun';
      hash = harunHash;
    } else if (name === 'BEDİRHAN ÇELİK') {
      username = 'Bedo';
      hash = bedoHash;
    } else {
      username = `pilot${i + 1}`;
      hash = pilotHash;
    }

    await prisma.user.create({
      data: {
        username,
        passwordHash: hash,
        role: 'PILOT',
        pilotId: pilots[i].id,
      },
    });
  }
  const totalUsers = 4 + pilots.length;
  console.log(`   ✅ Created ${totalUsers} users (1 admin, 1 office, 1 media, 1 harun, ${pilots.length} pilots)`);

  // =====================
  // 3. CREATE PRODUCTS (17)
  // =====================
  console.log('📦 Creating products...');

  await prisma.product.createMany({
    data: [
      // İçecekler (EUR)
      { name: 'Kola', category: 'İçecek', price: 2.00, priceCurrency: 'EUR', stock: 100, isActive: true, isFavorite: true, sortOrder: 1 },
      { name: 'Su', category: 'İçecek', price: 1.00, priceCurrency: 'EUR', stock: 200, isActive: true, isFavorite: true, sortOrder: 2 },
      { name: 'Ayran', category: 'İçecek', price: 1.50, priceCurrency: 'EUR', stock: 80, isActive: true, isFavorite: false, sortOrder: 3 },
      { name: 'Çay', category: 'İçecek', price: 1.50, priceCurrency: 'EUR', stock: null, isActive: true, isFavorite: true, sortOrder: 4 },
      { name: 'Kahve', category: 'İçecek', price: 2.50, priceCurrency: 'EUR', stock: null, isActive: true, isFavorite: false, sortOrder: 5 },
      { name: 'Meyve Suyu', category: 'İçecek', price: 2.00, priceCurrency: 'EUR', stock: 60, isActive: true, isFavorite: false, sortOrder: 6 },
      // Yiyecekler (EUR)
      { name: 'Tost', category: 'Yiyecek', price: 3.00, priceCurrency: 'EUR', stock: 30, isActive: true, isFavorite: true, sortOrder: 7 },
      { name: 'Gözleme', category: 'Yiyecek', price: 4.00, priceCurrency: 'EUR', stock: 25, isActive: true, isFavorite: true, sortOrder: 8 },
      { name: 'Sandviç', category: 'Yiyecek', price: 3.50, priceCurrency: 'EUR', stock: 20, isActive: true, isFavorite: false, sortOrder: 9 },
      // Hediyelik (EUR)
      { name: 'Magnet', category: 'Hediyelik', price: 3.00, priceCurrency: 'EUR', stock: 150, isActive: true, isFavorite: false, sortOrder: 10 },
      { name: 'Anahtarlık', category: 'Hediyelik', price: 2.00, priceCurrency: 'EUR', stock: 120, isActive: true, isFavorite: false, sortOrder: 11 },
      { name: 'Tişört', category: 'Hediyelik', price: 10.00, priceCurrency: 'EUR', stock: 40, isActive: true, isFavorite: false, sortOrder: 12 },
      { name: 'Şapka', category: 'Hediyelik', price: 7.00, priceCurrency: 'EUR', stock: 50, isActive: true, isFavorite: false, sortOrder: 13 },
      { name: 'Bardak', category: 'Hediyelik', price: 4.00, priceCurrency: 'EUR', stock: 80, isActive: true, isFavorite: false, sortOrder: 14 },
      // Foto/Video (EUR)
      { name: 'Fotoğraf/Video Paketi', category: 'Foto/Video', price: 25.00, priceCurrency: 'EUR', stock: null, isActive: true, isFavorite: true, sortOrder: 15 },
      { name: 'Sadece Fotoğraf', category: 'Foto/Video', price: 15.00, priceCurrency: 'EUR', stock: null, isActive: true, isFavorite: false, sortOrder: 16 },
      { name: 'Sadece Video', category: 'Foto/Video', price: 20.00, priceCurrency: 'EUR', stock: null, isActive: true, isFavorite: false, sortOrder: 17 },
    ],
  });
  console.log('   ✅ Created 17 products (EUR prices)');

  // =====================
  // 4. SIMULATE REAL QUEUE ROTATION
  // =====================
  console.log('👥 Simulating queue rotation with customers...');

  const customers: any[] = [];
  const flights: any[] = [];
  let customerIndex = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];

  // Track queue as array of pilot indices - simulates real rotation
  // Harun(0) ve Bedirhan(1) kuyrukta 1. ve 2. sıraya konacak, simülasyona dahil edilmiyor
  // Simülasyon pilot index 2'den (MİRZA TAYLAN) başlıyor
  const activePilotCount = 15;
  const queueStartIdx = 2; // Harun ve Bedirhan atlanıyor
  const queue = Array.from({ length: activePilotCount }, (_, i) => i + queueStartIdx); // [2..16]
  const pilotFlightCounts: number[] = new Array(pilotNames.length).fill(0);

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

  // --- Round 1: 15 customers, pilots[2..16] each get 1 (all completed) ---
  console.log('   Round 1: 15 pilota 1 müşteri (tamamlandı)...');
  for (let i = 0; i < activePilotCount; i++) {
    await assignCustomer('COMPLETED', 8 + Math.floor(i * 0.3));
  }

  // --- Round 2: 10 more customers (pilots[2..11] get 2nd flight, all completed) ---
  console.log('   Round 2: İlk 10 pilota 2. müşteri (tamamlandı)...');
  for (let i = 0; i < 10; i++) {
    await assignCustomer('COMPLETED', 10 + Math.floor(i * 0.3));
  }

  // --- TUNAHAN OĞUZ (pilots[3]) gets 5 more to reach limit (7 total) ---
  const tunahanIdx = 3; // TUNAHAN OĞUZ
  console.log(`   ${pilotNames[tunahanIdx]} limit dolduruluyor (7/7)...`);
  for (let i = 0; i < 5; i++) {
    const idx = queue.indexOf(tunahanIdx);
    queue.splice(idx, 1);
    queue.unshift(tunahanIdx);
    await assignCustomer('COMPLETED', 12 + i);
  }

  // --- 5 more active customers: 2 in-flight, 2 assigned, 1 in-flight ---
  console.log('   Aktif müşteriler oluşturuluyor...');
  // Remove TUNAHAN from queue (limit reached)
  const limitPilotIdx = queue.indexOf(tunahanIdx);
  if (limitPilotIdx !== -1) {
    queue.splice(limitPilotIdx, 1);
  }

  await assignCustomer('IN_FLIGHT', 14);
  await assignCustomer('IN_FLIGHT', 14);
  await assignCustomer('ASSIGNED', 0);
  await assignCustomer('IN_FLIGHT', 14);
  await assignCustomer('ASSIGNED', 0);

  console.log(`   ✅ Created ${customers.length} customers and ${flights.length} flights`);

  // =====================
  // 5. UPDATE PILOT STATS & QUEUE POSITIONS
  // =====================
  console.log('📊 Updating pilot statistics and queue positions...');

  // Tüm pilotları güncelle: uçuş sayısı + durum + sıra
  for (let i = 0; i < pilots.length; i++) {
    const pilot = pilots[i];

    const totalFlights = await prisma.flight.count({ where: { pilotId: pilot.id } });
    const inFlightCount = await prisma.flight.count({ where: { pilotId: pilot.id, status: 'IN_FLIGHT' } });
    const assignedCount = await prisma.flight.count({ where: { pilotId: pilot.id, status: 'ASSIGNED' } });

    let status: string = 'AVAILABLE';
    if (totalFlights >= 7) status = 'OFF_DUTY';
    else if (inFlightCount > 0) status = 'IN_FLIGHT';
    else if (assignedCount > 0) status = 'ASSIGNED';

    await prisma.pilot.update({
      where: { id: pilot.id },
      data: {
        dailyFlightCount: totalFlights,
        status,
        queuePosition: i + 1,
      },
    });
  }

  // Harun (idx 0) — seed'de 0 uçuş, sıra 1, AVAILABLE (simülasyona sokulmadı)
  // Bedirhan (idx 1) — seed'de 0 uçuş, sıra 2, AVAILABLE (simülasyona sokulmadı)
  // TUNAHAN OĞUZ (idx 3) — simülasyonla 7/7, OFF_DUTY (otomatik yukarıda işlendi)

  // =====================
  // 6. CREATE SALES
  // =====================
  console.log('💰 Creating sales...');

  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (!adminUser) throw new Error('Admin user not found');

  const completedCustomers = customers.filter(c => c.status === 'COMPLETED');
  let salesCount = 0;

  // Media sales for some completed customers — with PaymentDetail
  const mediaSaleCount = Math.min(15, completedCustomers.length);
  for (let i = 0; i < mediaSaleCount; i++) {
    const customer = completedCustomers[i];
    const isPaid = i < 10; // first 10 paid, rest unpaid

    // Farklı para birimleri ile ödeme
    const mediaCurrencies: Array<{ currency: 'EUR' | 'USD' | 'GBP' | 'TRY' | 'RUB'; rate: number; symbol: string }> = [
      { currency: 'EUR', rate: 1, symbol: '€' },
      { currency: 'USD', rate: 1.094, symbol: '$' },
      { currency: 'GBP', rate: 0.865, symbol: '£' },
      { currency: 'TRY', rate: 38.50, symbol: '₺' },
      { currency: 'RUB', rate: 106.95, symbol: '₽' },
    ];
    const curr = mediaCurrencies[i % mediaCurrencies.length];
    const eurPrice = 25;
    const localAmount = parseFloat((eurPrice * curr.rate).toFixed(2));
    const payMethod: 'CASH' | 'CREDIT_CARD' | 'TRANSFER' = i % 3 === 0 ? 'CASH' : i % 3 === 1 ? 'CREDIT_CARD' : 'CASH';

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: 'Fotoğraf/Video Paketi',
        itemType: 'Foto/Video',
        quantity: 1,
        unitPrice: eurPrice,
        totalPrice: localAmount,
        totalAmountEUR: eurPrice,
        totalAmountTRY: eurPrice * 38.50,
        primaryCurrency: curr.currency,
        isSplitPayment: false,
        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
        paymentMethod: isPaid ? payMethod : null,
      },
    });

    // PaymentDetail kaydı — kasada gerçek para birimi
    if (isPaid) {
      await prisma.paymentDetail.create({
        data: {
          saleId: sale.id,
          currency: curr.currency,
          amount: localAmount,
          amountInEUR: eurPrice,
          amountInTRY: eurPrice * 38.50,
          exchangeRate: curr.rate,
          exchangeSource: 'SEED',
          paymentMethod: payMethod,
        },
      });
    }

    salesCount++;

    if (isPaid) {
      await prisma.mediaFolder.updateMany({
        where: { customerId: customer.id },
        data: { paymentStatus: 'PAID', deliveryStatus: 'DELIVERED' },
      });
    }
  }

  // POS sales — farklı para birimleri ve split payment dahil
  const posProducts = [
    { name: 'Kola', type: 'İçecek', price: 2.00 },
    { name: 'Su', type: 'İçecek', price: 1.00 },
    { name: 'Çay', type: 'İçecek', price: 1.50 },
    { name: 'Tost', type: 'Yiyecek', price: 3.00 },
    { name: 'Gözleme', type: 'Yiyecek', price: 4.00 },
    { name: 'Magnet', type: 'Hediyelik', price: 3.00 },
    { name: 'Tişört', type: 'Hediyelik', price: 10.00 },
    { name: 'Şapka', type: 'Hediyelik', price: 7.00 },
  ];

  const paymentMethods: Array<'CASH' | 'CREDIT_CARD' | 'TRANSFER'> = ['CASH', 'CREDIT_CARD', 'TRANSFER'];

  // Senaryo 1: EUR nakit ödemeler (8 adet)
  for (let i = 0; i < 8; i++) {
    const product = posProducts[i % posProducts.length];
    const qty = Math.floor(Math.random() * 2) + 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalEUR,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'EUR',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'EUR',
        amount: totalEUR,
        amountInEUR: totalEUR,
        amountInTRY: totalEUR * 38.50,
        exchangeRate: 1,
        exchangeSource: 'SEED',
        paymentMethod: 'CASH',
      },
    });
    salesCount++;
  }

  // Senaryo 2: USD nakit ödemeler (5 adet)
  for (let i = 0; i < 5; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;
    const totalUSD = parseFloat((totalEUR * 1.094).toFixed(2));

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalUSD,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'USD',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'USD',
        amount: totalUSD,
        amountInEUR: totalEUR,
        amountInTRY: totalEUR * 38.50,
        exchangeRate: 1.094,
        exchangeSource: 'SEED',
        paymentMethod: 'CASH',
      },
    });
    salesCount++;
  }

  // Senaryo 3: GBP nakit ödemeler (3 adet)
  for (let i = 0; i < 3; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;
    const totalGBP = parseFloat((totalEUR * 0.865).toFixed(2));

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalGBP,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'GBP',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'GBP',
        amount: totalGBP,
        amountInEUR: totalEUR,
        amountInTRY: totalEUR * 38.50,
        exchangeRate: 0.865,
        exchangeSource: 'SEED',
        paymentMethod: 'CASH',
      },
    });
    salesCount++;
  }

  // Senaryo 4: RUB nakit ödemeler (2 adet)
  for (let i = 0; i < 2; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;
    const totalRUB = parseFloat((totalEUR * 106.95).toFixed(2));

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalRUB,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'RUB',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'RUB',
        amount: totalRUB,
        amountInEUR: totalEUR,
        amountInTRY: totalEUR * 38.50,
        exchangeRate: 106.95,
        exchangeSource: 'SEED',
        paymentMethod: 'CASH',
      },
    });
    salesCount++;
  }

  // Senaryo 5: TRY kredi kartı ödemeler (6 adet)
  for (let i = 0; i < 6; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = Math.floor(Math.random() * 2) + 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;
    const totalTRY = parseFloat((totalEUR * 38.50).toFixed(2));

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalTRY,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalTRY,
        primaryCurrency: 'TRY',
        paymentStatus: 'PAID',
        paymentMethod: 'CREDIT_CARD',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'TRY',
        amount: totalTRY,
        amountInEUR: totalEUR,
        amountInTRY: totalTRY,
        exchangeRate: 38.50,
        exchangeSource: 'SEED',
        paymentMethod: 'CREDIT_CARD',
      },
    });
    salesCount++;
  }

  // Senaryo 6: EUR kredi kartı ödemeler (4 adet)
  for (let i = 0; i < 4; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalEUR,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'EUR',
        paymentStatus: 'PAID',
        paymentMethod: 'CREDIT_CARD',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'EUR',
        amount: totalEUR,
        amountInEUR: totalEUR,
        amountInTRY: totalEUR * 38.50,
        exchangeRate: 1,
        exchangeSource: 'SEED',
        paymentMethod: 'CREDIT_CARD',
      },
    });
    salesCount++;
  }

  // Senaryo 7: TRY havale ödemeler (3 adet)
  for (let i = 0; i < 3; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;
    const totalTRY = parseFloat((totalEUR * 38.50).toFixed(2));

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalTRY,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalTRY,
        primaryCurrency: 'TRY',
        paymentStatus: 'PAID',
        paymentMethod: 'TRANSFER',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'TRY',
        amount: totalTRY,
        amountInEUR: totalEUR,
        amountInTRY: totalTRY,
        exchangeRate: 38.50,
        exchangeSource: 'SEED',
        paymentMethod: 'TRANSFER',
      },
    });
    salesCount++;
  }

  // Senaryo 8: Split payment — EUR nakit + TRY kart (2 adet)
  for (let i = 0; i < 2; i++) {
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = 10.00; // Tişört
    const eurCashPart = 5.00;
    const tryCashPart = parseFloat((5.00 * 38.50).toFixed(2)); // kalan 5 EUR'luk TRY kart

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: 'Tişört',
        itemType: 'Hediyelik',
        quantity: 1,
        unitPrice: 10.00,
        totalPrice: 10.00,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'EUR',
        isSplitPayment: true,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
    });
    // EUR nakit kısmı
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'EUR',
        amount: eurCashPart,
        amountInEUR: eurCashPart,
        amountInTRY: eurCashPart * 38.50,
        exchangeRate: 1,
        exchangeSource: 'SEED',
        paymentMethod: 'CASH',
      },
    });
    // TRY kart kısmı
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'TRY',
        amount: tryCashPart,
        amountInEUR: 5.00,
        amountInTRY: tryCashPart,
        exchangeRate: 38.50,
        exchangeSource: 'SEED',
        paymentMethod: 'CREDIT_CARD',
      },
    });
    salesCount++;
  }

  // Senaryo 9: Veresiye (ödenmemiş) — farklı para birimleri (4 adet)
  const unpaidCurrData: Array<{ currency: 'EUR' | 'USD' | 'TRY'; rate: number }> = [
    { currency: 'EUR', rate: 1 },
    { currency: 'USD', rate: 1.094 },
    { currency: 'TRY', rate: 38.50 },
    { currency: 'EUR', rate: 1 },
  ];
  for (let i = 0; i < 4; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;
    const curr = unpaidCurrData[i];
    const localAmount = parseFloat((totalEUR * curr.rate).toFixed(2));

    await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: adminUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: localAmount,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: curr.currency,
        paymentStatus: 'UNPAID',
        paymentMethod: null,
      },
    });
    salesCount++;
  }

  // =====================
  // HARUN'UN SATIŞLARI
  // =====================
  console.log('💼 Harun\'un satışları oluşturuluyor...');

  // Harun — POS satışları (EUR nakit)
  const harunPosProducts = [
    { name: 'Kola', type: 'İçecek', price: 2.00, qty: 3 },
    { name: 'Çay', type: 'İçecek', price: 1.50, qty: 5 },
    { name: 'Tost', type: 'Yiyecek', price: 3.00, qty: 2 },
    { name: 'Gözleme', type: 'Yiyecek', price: 4.00, qty: 2 },
    { name: 'Su', type: 'İçecek', price: 1.00, qty: 4 },
    { name: 'Magnet', type: 'Hediyelik', price: 3.00, qty: 3 },
    { name: 'Tişört', type: 'Hediyelik', price: 10.00, qty: 1 },
    { name: 'Şapka', type: 'Hediyelik', price: 7.00, qty: 2 },
  ];

  for (const item of harunPosProducts) {
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = item.price * item.qty;
    const method: 'CASH' | 'CREDIT_CARD' = Math.random() > 0.4 ? 'CASH' : 'CREDIT_CARD';

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: harunStaffUser.id,
        itemName: item.name,
        itemType: item.type,
        quantity: item.qty,
        unitPrice: item.price,
        totalPrice: totalEUR,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'EUR',
        paymentStatus: 'PAID',
        paymentMethod: method,
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'EUR',
        amount: totalEUR,
        amountInEUR: totalEUR,
        amountInTRY: totalEUR * 38.50,
        exchangeRate: 1,
        exchangeSource: 'SEED',
        paymentMethod: method,
      },
    });
    salesCount++;
  }

  // Harun — USD satışları (3 adet)
  for (let i = 0; i < 3; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = Math.floor(Math.random() * 2) + 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;
    const totalUSD = parseFloat((totalEUR * 1.094).toFixed(2));

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: harunStaffUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalUSD,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'USD',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'USD',
        amount: totalUSD,
        amountInEUR: totalEUR,
        amountInTRY: totalEUR * 38.50,
        exchangeRate: 1.094,
        exchangeSource: 'SEED',
        paymentMethod: 'CASH',
      },
    });
    salesCount++;
  }

  // Harun — TRY kredi kartı satışları (3 adet)
  for (let i = 0; i < 3; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const qty = Math.floor(Math.random() * 2) + 1;
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price * qty;
    const totalTRY = parseFloat((totalEUR * 38.50).toFixed(2));

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: harunStaffUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalTRY,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalTRY,
        primaryCurrency: 'TRY',
        paymentStatus: 'PAID',
        paymentMethod: 'CREDIT_CARD',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'TRY',
        amount: totalTRY,
        amountInEUR: totalEUR,
        amountInTRY: totalTRY,
        exchangeRate: 38.50,
        exchangeSource: 'SEED',
        paymentMethod: 'CREDIT_CARD',
      },
    });
    salesCount++;
  }

  // Harun — Foto/Video satışları (5 adet, farklı para birimleri)
  const harunMediaCurrencies: Array<{ currency: 'EUR' | 'USD' | 'GBP' | 'TRY'; rate: number; method: 'CASH' | 'CREDIT_CARD' }> = [
    { currency: 'EUR', rate: 1, method: 'CASH' },
    { currency: 'USD', rate: 1.094, method: 'CASH' },
    { currency: 'TRY', rate: 38.50, method: 'CREDIT_CARD' },
    { currency: 'GBP', rate: 0.865, method: 'CASH' },
    { currency: 'EUR', rate: 1, method: 'CREDIT_CARD' },
  ];

  for (let i = 0; i < harunMediaCurrencies.length; i++) {
    const customer = completedCustomers[mediaSaleCount + i < completedCustomers.length ? mediaSaleCount + i : Math.floor(Math.random() * completedCustomers.length)];
    const curr = harunMediaCurrencies[i];
    const eurPrice = 25;
    const localAmount = parseFloat((eurPrice * curr.rate).toFixed(2));

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: harunStaffUser.id,
        itemName: 'Fotoğraf/Video Paketi',
        itemType: 'Foto/Video',
        quantity: 1,
        unitPrice: eurPrice,
        totalPrice: localAmount,
        totalAmountEUR: eurPrice,
        totalAmountTRY: eurPrice * 38.50,
        primaryCurrency: curr.currency,
        isSplitPayment: false,
        paymentStatus: 'PAID',
        paymentMethod: curr.method,
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: curr.currency,
        amount: localAmount,
        amountInEUR: eurPrice,
        amountInTRY: eurPrice * 38.50,
        exchangeRate: curr.rate,
        exchangeSource: 'SEED',
        paymentMethod: curr.method,
      },
    });
    salesCount++;

    // Medya klasörünü de ödendi yap
    await prisma.mediaFolder.updateMany({
      where: { customerId: customer.id },
      data: { paymentStatus: 'PAID', paymentAmount: eurPrice, deliveryStatus: 'DELIVERED' },
    });
  }

  // Harun — Split payment (EUR nakit + TRY kart)
  {
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = 10.00;

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: harunStaffUser.id,
        itemName: 'Tişört',
        itemType: 'Hediyelik',
        quantity: 1,
        unitPrice: 10.00,
        totalPrice: 10.00,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'EUR',
        isSplitPayment: true,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'EUR',
        amount: 5.00,
        amountInEUR: 5.00,
        amountInTRY: 5.00 * 38.50,
        exchangeRate: 1,
        exchangeSource: 'SEED',
        paymentMethod: 'CASH',
      },
    });
    await prisma.paymentDetail.create({
      data: {
        saleId: sale.id,
        currency: 'TRY',
        amount: 192.50,
        amountInEUR: 5.00,
        amountInTRY: 192.50,
        exchangeRate: 38.50,
        exchangeSource: 'SEED',
        paymentMethod: 'CREDIT_CARD',
      },
    });
    salesCount++;
  }

  // Harun — Veresiye (ödenmemiş, 2 adet)
  for (let i = 0; i < 2; i++) {
    const product = posProducts[Math.floor(Math.random() * posProducts.length)];
    const customer = completedCustomers[Math.floor(Math.random() * completedCustomers.length)];
    const totalEUR = product.price;

    await prisma.sale.create({
      data: {
        customerId: customer.id,
        soldById: harunStaffUser.id,
        itemName: product.name,
        itemType: product.type,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: totalEUR,
        totalAmountEUR: totalEUR,
        totalAmountTRY: totalEUR * 38.50,
        primaryCurrency: 'EUR',
        paymentStatus: 'UNPAID',
        paymentMethod: null,
      },
    });
    salesCount++;
  }

  console.log(`   ✅ Harun: 22 satış (8 POS, 3 USD, 3 TRY kart, 5 Foto/Video, 1 split, 2 veresiye)`);

  console.log(`   ✅ Created ${salesCount} sales records`);

  // =====================
  // 6b. SEED EXCHANGE RATES
  // =====================
  console.log('💱 Creating default exchange rates...');

  const now = new Date();
  const defaultRates = [
    { currency: 'TRY' as const, buyRate: 38.50, sellRate: 39.27 },
    { currency: 'USD' as const, buyRate: 0.9143, sellRate: 0.9326 },
    { currency: 'GBP' as const, buyRate: 1.1558, sellRate: 1.1789 },
    { currency: 'RUB' as const, buyRate: 0.00935, sellRate: 0.00954 },
  ];

  for (const rate of defaultRates) {
    await prisma.exchangeRate.create({
      data: {
        baseCurrency: 'EUR',
        currency: rate.currency,
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        source: 'SEED',
        fetchedAt: now,
      },
    });
    await prisma.exchangeRateHistory.create({
      data: {
        baseCurrency: 'EUR',
        currency: rate.currency,
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        source: 'SEED',
        fetchedAt: now,
      },
    });
  }
  console.log('   ✅ Created 4 exchange rates (EUR base)');

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
  // 8. CREATE DEFAULT NOTIFICATION SETTINGS
  // =====================
  console.log('🔔 Creating default notification settings...');

  await prisma.notificationSetting.deleteMany();
  await prisma.notificationSetting.create({
    data: {
      settings: {
        customer_assigned: { enabled: true, label: 'Müşteri Atandı', description: 'Pilota yeni müşteri atandığında bildirim gönder', title: '🪂 Yeni Müşteri Atandı', body: '{customer} ({displayId}) - {weight}kg' },
        customer_reassigned: { enabled: true, label: 'Müşteri Yeniden Atandı', description: 'Pilot değişikliğinde yeni pilota bildirim gönder', title: '🪂 Yeni Müşteri Atandı', body: '{customer} ({displayId}) - {weight}kg' },
        flight_cancelled: { enabled: true, label: 'Uçuş İptal Edildi', description: 'Uçuş iptal edildiğinde pilota bildirim gönder', title: '❌ Uçuş İptal Edildi', body: '{customer} ({displayId})' },
        flight_completed: { enabled: true, label: 'Uçuş Tamamlandı', description: 'Uçuş tamamlandığında pilota bildirim gönder', title: '✅ Uçuş Tamamlandı', body: '{customer} ({displayId}) - {duration}dk' },
        pilot_limit_warning: { enabled: true, label: 'Limit Uyarısı', description: 'Pilot günlük limite yaklaştığında bildirim gönder', title: '⚠️ Limit Uyarısı', body: 'Günlük uçuş limitine yaklaştınız: {current}/{max}' },
        pilot_limit_reached: { enabled: true, label: 'Limit Doldu', description: 'Pilot günlük limitine ulaştığında bildirim gönder', title: '🛑 Günlük Limit Doldu', body: '{current}/{max} uçuş tamamlandı. Bugünlük sıra dışısınız.' },
      },
    },
  });

  console.log('   ✅ Created default notification settings');

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
  console.log('   HARUN:     harun / harun123');
  console.log(`   PILOTS:    pilot1 / pilot123  →  pilot${pilots.length} / pilot123`);
  console.log('───────────────────────────────────────────────────────────────');
  console.log('');
  console.log('📊 DATA SUMMARY:');
  console.log(`   • ${pilots.length} Pilots (1 limit dolu: ${pilotNames[tunahanIdx]})`);
  console.log(`   • ${totalUsers} Users (admin, ofis, medya, harun + ${pilots.length} pilot)`);
  console.log(`   • 17 Products`);
  console.log(`   • ${customers.length} Customers`);
  console.log(`   • ${flights.length} Flights`);
  console.log(`   • ${salesCount} Sales (admin + harun satışları)`);
  console.log('');
  console.log('🔄 PILOT SIRASI (queuePosition):');
  console.log('───────────────────────────────────────────────────────────────');
  for (const p of finalPilots) {
    const isLimit = p.dailyFlightCount >= p.maxDailyFlights;
    const statusLabel = p.status === 'IN_FLIGHT' ? '✈️  Uçuşta' : p.status === 'ASSIGNED' ? '👤 Müşteri Atandı' : p.status === 'AVAILABLE' ? '✅ Müsait' : `⏸  ${p.status}`;
    const limitLabel = isLimit ? ' ❌ LİMİT' : '';
    console.log(`   ${String(p.queuePosition).padStart(2)}. ${p.name.padEnd(25)} ${p.dailyFlightCount}/${p.maxDailyFlights}  ${statusLabel}${limitLabel}`);
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
