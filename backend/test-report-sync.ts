// Test script for Reports API sync
import { PrismaClient } from '@prisma/client';
import ReportService from './src/services/report.service';

const prisma = new PrismaClient();

async function test() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('=== TESTING REPORTS API SYNC ===\n');
  console.log('This uses Amazon Reports API instead of Orders API');
  console.log('Much faster: ~5 minutes instead of 41+ hours!\n');

  try {
    const reportService = new ReportService(accountId);

    // Sync last 90 days (for testing - use 730 for full sync)
    const result = await reportService.syncOrdersViaReport(accountId, 90);

    console.log('\n✅ Sync completed successfully!');
    console.log(`   Orders processed: ${result.ordersProcessed}`);
    console.log(`   Items processed: ${result.itemsProcessed}`);

    // Check database state
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

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
