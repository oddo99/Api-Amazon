// Sync financial events with marketplace fix
import { PrismaClient } from '@prisma/client';
import FinanceService from './src/services/finance.service';

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('=== SYNCING FINANCIAL DATA (ALL MARKETPLACES) ===\n');

  console.log('📊 Starting financial events sync for all marketplaces...\n');

  try {
    const financeService = new FinanceService(accountId);
    const result = await financeService.syncFinancialEvents(accountId, 730);

    console.log('\n✅ Sync completed!');
    console.log(`   Events processed: ${result.eventsProcessed}`);

    // Check results
    console.log('\n📈 Checking marketplace distribution...\n');

    const financesByMp = await prisma.$queryRaw<Array<{
      marketplaceId: string;
      count: bigint;
      oldest: Date;
      newest: Date;
    }>>`
      SELECT marketplaceId, COUNT(*) as count,
             MIN(postedDate) as oldest,
             MAX(postedDate) as newest
      FROM FinancialEvent
      WHERE accountId = ${accountId}
      AND marketplaceId IS NOT NULL
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

    console.log('FINANCIAL EVENTS by marketplace:');
    financesByMp.forEach(m => {
      const name = marketplaceNames[m.marketplaceId] || m.marketplaceId;
      const oldest = new Date(m.oldest).toISOString().split('T')[0];
      const newest = new Date(m.newest).toISOString().split('T')[0];
      const count = Number(m.count);
      console.log(`  ${name.padEnd(12)}: ${String(count).padStart(5)} events  (${oldest} → ${newest})`);
    });

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
