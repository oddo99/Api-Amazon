import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const events = await prisma.financialEvent.findMany({
    where: { eventType: 'DeferredTransaction' },
    orderBy: { postedDate: 'desc' },
    take: 30
  });

  console.log(`Total deferred transactions in database: ${events.length}`);
  console.log('');
  console.log('Recent deferred transactions:');
  events.forEach(e => {
    console.log(`- ${e.amazonOrderId || 'No Order'} | ${e.sku || 'No SKU'} | ${e.amount} ${e.currency} | ${e.postedDate.toISOString().split('T')[0]}`);
  });

  // Search for our specific orders
  console.log('');
  console.log('Searching for specific orders:');
  const order1 = await prisma.financialEvent.findMany({
    where: { amazonOrderId: '304-2216059-3290743' }
  });
  const order2 = await prisma.financialEvent.findMany({
    where: { amazonOrderId: '306-5361600-3434713' }
  });

  console.log(`304-2216059-3290743: ${order1.length} events found`);
  console.log(`306-5361600-3434713: ${order2.length} events found`);

  await prisma.$disconnect();
})();
