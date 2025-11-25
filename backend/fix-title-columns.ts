import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('Modifying Product.title column...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE Product MODIFY COLUMN title TEXT NOT NULL
  `);

  console.log('Modifying OrderItem.title column...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE OrderItem MODIFY COLUMN title TEXT NOT NULL
  `);

  console.log('✅ Title columns updated to TEXT');
}

fix().then(() => process.exit(0)).catch(console.error);
