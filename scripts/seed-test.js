require('dotenv').config({ path: require('path').join(__dirname, '../packages/api/.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Mevcut verileri temizleniyor...');

  // Sırayla sil (foreign key constraints)
  await prisma.pushSubscription.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.mediaFolder.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pilot.deleteMany();
  await prisma.product.deleteMany();

  console.log('✅ Veriler temizlendi');

  // 10 Pilot oluştur
  const pilotNames = [
    'Ahmet Yılmaz',
    'Mehmet Kaya',
    'Ali Demir',
    'Mustafa Şahin',
    'Hüseyin Çelik',
    'İbrahim Yıldız',
    'Osman Aydın',
    'Hasan Arslan',
    'Yusuf Koç',
    'Murat Özdemir'
  ];

  console.log('👨‍✈️ 10 Pilot oluşturuluyor...');

  const pilots = [];
  for (let i = 0; i < pilotNames.length; i++) {
    const pilot = await prisma.pilot.create({
      data: {
        name: pilotNames[i],
        phone: `053${String(i).padStart(8, '0')}`,
        email: `pilot${i + 1}@skytrack.com`,
        isActive: true,
        status: 'AVAILABLE',
        maxDailyFlights: 7,
        dailyFlightCount: 0,
        queuePosition: i + 1,
      }
    });
    pilots.push(pilot);
    console.log(`  ✓ ${pilot.name}`);
  }

  // Admin kullanıcı
  console.log('👤 Admin kullanıcı oluşturuluyor...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      username: 'admin',
      name: 'Sistem Yöneticisi',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    }
  });
  console.log('  ✓ admin / admin123');

  // Pilot kullanıcıları
  console.log('👥 Pilot kullanıcıları oluşturuluyor...');
  for (let i = 0; i < pilots.length; i++) {
    const pilot = pilots[i];
    const username = `pilot${i + 1}`;
    const password = `pilot${i + 1}`;
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        name: pilot.name,
        passwordHash,
        role: 'PILOT',
        pilotId: pilot.id,
        isActive: true,
      }
    });
    console.log(`  ✓ ${username} / ${password} -> ${pilot.name}`);
  }

  // Bugün için müşteriler ve uçuşlar
  console.log('🧑‍🤝‍🧑 Müşteriler ve uçuşlar oluşturuluyor...');

  const customerNames = [
    ['Ayşe', 'Yılmaz'], ['Fatma', 'Kaya'], ['Zeynep', 'Demir'],
    ['Elif', 'Şahin'], ['Merve', 'Çelik'], ['Esra', 'Yıldız'],
    ['Selin', 'Aydın'], ['Deniz', 'Arslan'], ['Ceren', 'Koç'],
    ['Büşra', 'Özdemir'], ['Gizem', 'Aktaş'], ['Pınar', 'Bulut'],
    ['Ebru', 'Doğan'], ['Sevgi', 'Kurt'], ['Melek', 'Korkmaz']
  ];

  const statuses = ['ASSIGNED', 'PICKED_UP', 'IN_FLIGHT', 'COMPLETED'];

  for (let i = 0; i < customerNames.length; i++) {
    const [firstName, lastName] = customerNames[i];
    const displayId = `T${String(i + 1).padStart(4, '0')}`;
    const pilotIndex = i % pilots.length;
    const pilot = pilots[pilotIndex];

    // Müşteri oluştur
    const customer = await prisma.customer.create({
      data: {
        displayId,
        firstName,
        lastName,
        phone: `054${String(i).padStart(8, '0')}`,
        weight: 55 + Math.floor(Math.random() * 40),
        status: 'ASSIGNED',
        waiverSigned: true,
        waiverSignedAt: new Date(),
        assignedPilotId: pilot.id,
      }
    });

    // Uçuş durumunu belirle
    let flightStatus;
    let customerStatus;
    if (i < 3) {
      flightStatus = 'IN_FLIGHT'; // 3 uçuşta
      customerStatus = 'IN_FLIGHT';
    } else if (i < 6) {
      flightStatus = 'PICKED_UP'; // 3 alındı
      customerStatus = 'ASSIGNED';
    } else if (i < 10) {
      flightStatus = 'ASSIGNED'; // 4 bekliyor
      customerStatus = 'ASSIGNED';
    } else {
      flightStatus = 'COMPLETED'; // 5 tamamlandı
      customerStatus = 'COMPLETED';
    }

    // Müşteri status'unu güncelle
    await prisma.customer.update({
      where: { id: customer.id },
      data: { status: customerStatus }
    });

    // Uçuş oluştur
    const now = new Date();
    let takeoffAt = null;
    let landingAt = null;

    if (flightStatus === 'IN_FLIGHT') {
      takeoffAt = new Date(now.getTime() - (5 + i) * 60000); // 5-7 dakika önce
    } else if (flightStatus === 'COMPLETED') {
      takeoffAt = new Date(now.getTime() - (30 + i * 5) * 60000);
      landingAt = new Date(now.getTime() - (15 + i * 3) * 60000);
    }

    await prisma.flight.create({
      data: {
        customerId: customer.id,
        pilotId: pilot.id,
        status: flightStatus,
        takeoffAt,
        landingAt,
      }
    });

    // Pilot uçuş sayısını güncelle
    if (flightStatus !== 'CANCELLED') {
      await prisma.pilot.update({
        where: { id: pilot.id },
        data: {
          dailyFlightCount: { increment: 1 },
          status: flightStatus === 'IN_FLIGHT' ? 'IN_FLIGHT' : 'AVAILABLE'
        }
      });
    }

    console.log(`  ✓ ${displayId} - ${firstName} ${lastName} -> ${pilot.name} (${flightStatus} / Customer: ${customerStatus})`);
  }

  // Ürünler
  console.log('📦 Ürünler oluşturuluyor...');
  const productsData = [
    { name: 'Uçuş Videosu (USB)', price: 500, category: 'VIDEO' },
    { name: 'Uçuş Fotoğrafları', price: 300, category: 'PHOTO' },
    { name: 'Video + Fotoğraf Paketi', price: 700, category: 'PACKAGE' },
    { name: 'SkyTrack T-Shirt', price: 150, category: 'Hediyelik' },
    { name: 'Paraşüt Anahtarlık', price: 50, category: 'Hediyelik' },
    { name: 'Kola 330ml', price: 25, category: 'İçecek' },
    { name: 'Su 500ml', price: 10, category: 'İçecek' },
    { name: 'Ayran', price: 15, category: 'İçecek' },
    { name: 'Çay', price: 10, category: 'İçecek' },
    { name: 'Kahve', price: 25, category: 'İçecek' },
    { name: 'Tost', price: 40, category: 'Yiyecek' },
    { name: 'Sandviç', price: 50, category: 'Yiyecek' },
    { name: 'Cips', price: 20, category: 'Yiyecek' },
    { name: 'Çikolata', price: 15, category: 'Yiyecek' },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        price: p.price,
        category: p.category,
        isActive: true,
        stock: 100,
      }
    });
    createdProducts.push(product);
    console.log(`  ✓ ${p.name} - ${p.price} TL (${p.category})`);
  }

  // Satışlar oluştur (tamamlanan uçuşlar için)
  console.log('💰 Satışlar oluşturuluyor...');

  // Admin user'ı al (satış yapan kişi olarak)
  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });

  // Tamamlanan müşterileri al (index 10-14)
  const completedCustomers = await prisma.customer.findMany({
    where: { status: 'COMPLETED' }
  });

  for (let i = 0; i < completedCustomers.length; i++) {
    const customer = completedCustomers[i];
    const now = new Date();

    // Her müşteri için farklı satış senaryoları
    if (i === 0) {
      // T0011 - Video + Fotoğraf paketi aldı, ödedi
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'PACKAGE',
          itemName: 'Video + Fotoğraf Paketi',
          quantity: 1,
          unitPrice: 700,
          totalPrice: 700,
          paymentStatus: 'PAID',
          paymentMethod: 'CREDIT_CARD',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 60 * 60000),
        }
      });
      console.log(`  ✓ ${customer.displayId} - 700 TL (PAID)`);
    } else if (i === 1) {
      // T0012 - Video aldı + içecekler, ödedi (3 ayrı satış)
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'VIDEO',
          itemName: 'Uçuş Videosu (USB)',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
          paymentStatus: 'PAID',
          paymentMethod: 'CASH',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 45 * 60000),
        }
      });
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'İçecek',
          itemName: 'Kola 330ml',
          quantity: 1,
          unitPrice: 25,
          totalPrice: 25,
          paymentStatus: 'PAID',
          paymentMethod: 'CASH',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 44 * 60000),
        }
      });
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'İçecek',
          itemName: 'Su 500ml',
          quantity: 1,
          unitPrice: 10,
          totalPrice: 10,
          paymentStatus: 'PAID',
          paymentMethod: 'CASH',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 43 * 60000),
        }
      });
      console.log(`  ✓ ${customer.displayId} - 535 TL (3 satış, PAID)`);
    } else if (i === 2) {
      // T0013 - Fotoğraf aldı, ÖDEMEDİ (bakiye var)
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'PHOTO',
          itemName: 'Uçuş Fotoğrafları',
          quantity: 1,
          unitPrice: 300,
          totalPrice: 300,
          paymentStatus: 'UNPAID',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 30 * 60000),
        }
      });
      console.log(`  ✓ ${customer.displayId} - 300 TL (UNPAID - BAKİYE VAR)`);
    } else if (i === 3) {
      // T0014 - Video ödenmiş, yemek ödenmemiş
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'VIDEO',
          itemName: 'Uçuş Videosu (USB)',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
          paymentStatus: 'PAID',
          paymentMethod: 'CREDIT_CARD',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 50 * 60000),
        }
      });
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'Yiyecek',
          itemName: 'Tost',
          quantity: 1,
          unitPrice: 40,
          totalPrice: 40,
          paymentStatus: 'UNPAID',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 20 * 60000),
        }
      });
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'İçecek',
          itemName: 'Kola 330ml',
          quantity: 1,
          unitPrice: 25,
          totalPrice: 25,
          paymentStatus: 'UNPAID',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 19 * 60000),
        }
      });
      console.log(`  ✓ ${customer.displayId} - 500 TL (PAID) + 65 TL (UNPAID - BAKİYE VAR)`);
    } else if (i === 4) {
      // T0015 - T-shirt ve anahtarlık aldı, ödedi
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'Hediyelik',
          itemName: 'SkyTrack T-Shirt',
          quantity: 1,
          unitPrice: 150,
          totalPrice: 150,
          paymentStatus: 'PAID',
          paymentMethod: 'CASH',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 15 * 60000),
        }
      });
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          itemType: 'Hediyelik',
          itemName: 'Paraşüt Anahtarlık',
          quantity: 1,
          unitPrice: 50,
          totalPrice: 50,
          paymentStatus: 'PAID',
          paymentMethod: 'CASH',
          soldById: adminUser.id,
          createdAt: new Date(now.getTime() - 14 * 60000),
        }
      });
      console.log(`  ✓ ${customer.displayId} - 200 TL (2 satış, PAID)`);
    }
  }

  console.log('\n🎉 Seed tamamlandı!');
  console.log('\n📋 Giriş bilgileri:');
  console.log('  Admin: admin / admin123');
  console.log('  Pilotlar: pilot1/pilot1, pilot2/pilot2, ... pilot10/pilot10');
  console.log('\n💳 Bakiyesi olan müşteriler:');
  console.log('  T0013 - 300 TL bakiye');
  console.log('  T0014 - 65 TL bakiye');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
