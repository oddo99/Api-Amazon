// Monitor sync progress and notify when complete
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProgress() {
  const orderCount = await prisma.order.count({
    where: { accountId: 'cmggmot2a0005g9362659z7xx' }
  });

  const ordersByMp = await prisma.$queryRaw<Array<{
    marketplaceId: string;
    count: bigint;
  }>>`
    SELECT marketplaceId, COUNT(*) as count
    FROM \`Order\`
    WHERE accountId = 'cmggmot2a0005g9362659z7xx'
    GROUP BY marketplaceId
  `;

  return { total: orderCount, byMarketplace: ordersByMp };
}

async function monitor() {
  const targetTotal = 2493; // Expected total from API
  let previousCount = 0;
  let stableCount = 0;

  console.log('🔍 Monitoring sync progress...\n');
  console.log(`Target: ${targetTotal} orders\n`);

  const interval = setInterval(async () => {
    try {
      const progress = await checkProgress();
      const current = progress.total;
      const percentage = ((current / targetTotal) * 100).toFixed(1);

      console.log(`📊 Progress: ${current}/${targetTotal} orders (${percentage}%)`);

      // Check if count is stable (not changing)
      if (current === previousCount) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      // If count hasn't changed for 3 checks (30 seconds), consider it done
      if (stableCount >= 3 && current > 0) {
        console.log('\n✅ SYNC COMPLETATO!\n');

        const marketplaceNames: Record<string, string> = {
          'A1F83G8C2ARO7P': 'UK',
          'A1PA6795UKMFR9': 'Germany',
          'A13V1IB3VIYZZH': 'France',
          'APJ6JRA9NG5V4': 'Italy',
          'A1RKKUPIHCS9HS': 'Spain',
          'A1805IZSGTT6HS': 'Netherlands',
        };

        console.log('📈 Risultati finali:');
        progress.byMarketplace.forEach(m => {
          const name = marketplaceNames[m.marketplaceId] || m.marketplaceId;
          console.log(`  ${name.padEnd(12)}: ${Number(m.count)} ordini`);
        });
        console.log(`\n  TOTALE: ${current} ordini`);

        if (current < targetTotal) {
          console.log(`\n⚠️  Nota: ${targetTotal - current} ordini potrebbero essere duplicati o già esistenti`);
        }

        clearInterval(interval);
        await prisma.$disconnect();
        process.exit(0);
      }

      previousCount = current;

    } catch (error) {
      console.error('Error checking progress:', error);
    }
  }, 10000); // Check every 10 seconds
}

monitor().catch(console.error);
