import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixPilotPasswords() {
  const hashedPassword = await bcrypt.hash('pilot123', 10);
  
  // Update all pilots with passwordHash field
  const result = await prisma.user.updateMany({
    where: { role: 'PILOT' },
    data: { passwordHash: hashedPassword }
  });
  
  console.log(`Updated ${result.count} pilot passwords`);
  
  // List pilots
  const pilots = await prisma.user.findMany({
    where: { role: 'PILOT' },
    select: { id: true, name: true, email: true, phone: true }
  });
  
  console.log('\nPilot accounts:');
  pilots.forEach(p => {
    console.log(`- ${p.name} | Email: ${p.email} | Phone: ${p.phone}`);
  });
  
  await prisma.$disconnect();
}

fixPilotPasswords();
