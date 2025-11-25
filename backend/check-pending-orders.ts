import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPendingOrders() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  // Get Pending orders
  const pendingOrders = await prisma.order.findMany({
    where: {
      accountId,
      orderStatus: 'Pending',
      marketplaceId: 'A1PA6795UKMFR9'
    },
    include: {
      items: true
    },
    take: 3
  });

  if (pendingOrders.length === 0) {
    console.log('No Pending orders found');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📦 Pending Orders Examples:\n');

  for (const order of pendingOrders) {
    console.log(`Order ID: ${order.amazonOrderId}`);
    console.log(`  Total Amount in DB: ${order.totalAmount}`);
    console.log(`  Number of Items: ${order.numberOfItems}`);
    console.log('  Items:');

    let calculatedTotal = 0;
    order.items.forEach(item => {
      console.log(`    - ${item.sku}: qty=${item.quantity}, itemPrice=${item.itemPrice}`);
      calculatedTotal += item.itemPrice || 0;
    });

    console.log(`  Calculated total from items: ${calculatedTotal}`);
    console.log();
  }

  await prisma.$disconnect();
}

checkPendingOrders().catch(console.error);
