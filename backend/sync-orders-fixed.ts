// Sync orders using the fixed multi-marketplace logic
import { PrismaClient } from '@prisma/client';
import OrderService from './src/services/order.service';

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('=== SYNCING ORDERS (FIXED MULTI-MARKETPLACE) ===\n');
  console.log('This will fetch orders from each marketplace separately');
  console.log('to avoid Amazon API issues with multiple marketplaces.\n');

  try {
    const orderService = new OrderService(accountId);
    const result = await orderService.syncOrders(accountId, 730);

    console.log('\n✅ Sync completed successfully!');
    console.log(`   Total orders processed: ${result.ordersProcessed}`);

    // Check final database state
    console.log('\n📊 Checking database state...\n');

    const ordersByMp = await prisma.$queryRaw<Array<{
      marketplaceId: string;
      count: bigint;
      oldest: Date;
      newest: Date;
    }>>`
      SELECT marketplaceId, COUNT(*) as count,
             MIN(purchaseDate) as oldest,
             MAX(purchaseDate) as newest
      FROM \`Order\`
      WHERE accountId = ${accountId}
      GROUP BY marketplaceId
      ORDER BY count DESC
    `;

    const marketplaceNames: Record<string, string> = {
      'A1F83G8C2ARO7P': 'UK',
      'A1PA6795UKMFR9': 'Germany',
      'A13V1IB3VIYZZH': 'France',
      'APJ6JRA9NG5V4': 'Italy',
      'A1RKKUPIHCS9HS': 'Spain',
      'A1805IZSGTT6HS': 'Netherlands',
    };

    console.log('ORDERS in database by marketplace:');
    ordersByMp.forEach(m => {
      const name = marketplaceNames[m.marketplaceId] || m.marketplaceId;
      const oldest = new Date(m.oldest).toISOString().split('T')[0];
      const newest = new Date(m.newest).toISOString().split('T')[0];
      const count = Number(m.count);
      console.log(`  ${name.padEnd(12)}: ${String(count).padStart(4)} orders  (${oldest} → ${newest})`);
    });

    const totalOrders = await prisma.order.count({ where: { accountId } });
    console.log(`\n  TOTAL: ${totalOrders} orders`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
