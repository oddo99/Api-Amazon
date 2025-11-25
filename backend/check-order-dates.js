// Check dates of orders in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      purchaseDate: true,
      amazonOrderId: true,
      totalAmount: true,
    },
    orderBy: {
      purchaseDate: 'desc',
    },
    take: 10,
  });

  console.log('Latest 10 orders:');
  orders.forEach((order) => {
    console.log(`  ${order.purchaseDate.toISOString().split('T')[0]} - ${order.amazonOrderId} - €${order.totalAmount}`);
  });

  const oldest = await prisma.order.findFirst({
    orderBy: {
      purchaseDate: 'asc',
    },
  });

  console.log(`\nOldest order: ${oldest?.purchaseDate.toISOString().split('T')[0]}`);

  const newest = await prisma.order.findFirst({
    orderBy: {
      purchaseDate: 'desc',
    },
  });

  console.log(`Newest order: ${newest?.purchaseDate.toISOString().split('T')[0]}`);

  const count = await prisma.order.count();
  console.log(`Total orders: ${count}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
