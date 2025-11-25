// Check complete data summary
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== DATA SUMMARY ===\n');

  // Orders
  const ordersCount = await prisma.order.count();
  const oldestOrder = await prisma.order.findFirst({
    orderBy: { purchaseDate: 'asc' },
    select: { purchaseDate: true, amazonOrderId: true },
  });
  const newestOrder = await prisma.order.findFirst({
    orderBy: { purchaseDate: 'desc' },
    select: { purchaseDate: true, amazonOrderId: true },
  });

  console.log('📦 ORDERS:');
  console.log(`  Total: ${ordersCount}`);
  console.log(`  Oldest: ${oldestOrder?.purchaseDate.toISOString().split('T')[0]} (${oldestOrder?.amazonOrderId})`);
  console.log(`  Newest: ${newestOrder?.purchaseDate.toISOString().split('T')[0]} (${newestOrder?.amazonOrderId})`);

  // Financial Events
  const eventsCount = await prisma.financialEvent.count();
  const oldestEvent = await prisma.financialEvent.findFirst({
    orderBy: { postedDate: 'asc' },
    select: { postedDate: true, eventType: true },
  });
  const newestEvent = await prisma.financialEvent.findFirst({
    orderBy: { postedDate: 'desc' },
    select: { postedDate: true, eventType: true },
  });

  console.log('\n💰 FINANCIAL EVENTS:');
  console.log(`  Total: ${eventsCount}`);
  console.log(`  Oldest: ${oldestEvent?.postedDate.toISOString().split('T')[0]} (${oldestEvent?.eventType})`);
  console.log(`  Newest: ${newestEvent?.postedDate.toISOString().split('T')[0]} (${newestEvent?.eventType})`);

  // Event types breakdown
  const eventTypes = await prisma.financialEvent.groupBy({
    by: ['eventType'],
    _count: { eventType: true },
  });

  console.log('\n  Breakdown by type:');
  eventTypes.forEach(type => {
    console.log(`    ${type.eventType}: ${type._count.eventType}`);
  });

  // Products
  const productsCount = await prisma.product.count();
  console.log(`\n📦 PRODUCTS: ${productsCount}`);

  // Inventory
  const inventoryCount = await prisma.inventory.count();
  console.log(`📊 INVENTORY RECORDS: ${inventoryCount}`);

  // Date gap analysis
  const daysBetween = Math.floor((new Date(newestOrder?.purchaseDate) - new Date(newestEvent?.postedDate)) / (1000 * 60 * 60 * 24));

  console.log('\n⚠️  DATA GAP ANALYSIS:');
  console.log(`  Orders go up to: ${newestOrder?.purchaseDate.toISOString().split('T')[0]}`);
  console.log(`  Financial events stop at: ${newestEvent?.postedDate.toISOString().split('T')[0]}`);
  console.log(`  Gap: ${daysBetween} days`);
  console.log(`\n  This gap suggests Amazon SP-API is limiting financial data availability.`);
  console.log(`  The API may only provide financial events for a restricted period.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
