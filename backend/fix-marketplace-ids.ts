// Fix marketplace IDs in existing financial events
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('=== FIXING MARKETPLACE IDs IN FINANCIAL EVENTS ===\n');

  // Get all financial events with amazonOrderId
  const events = await prisma.financialEvent.findMany({
    where: {
      accountId,
      amazonOrderId: { not: null }
    },
    select: {
      id: true,
      amazonOrderId: true,
      marketplaceId: true,
    }
  });

  console.log(`Found ${events.length} events with order IDs\n`);

  let updated = 0;
  let skipped = 0;
  const updates: Record<string, number> = {};

  for (const event of events) {
    // Get the correct marketplace from the order
    const order = await prisma.order.findUnique({
      where: { amazonOrderId: event.amazonOrderId! },
      select: { marketplaceId: true }
    });

    if (order && order.marketplaceId !== event.marketplaceId) {
      // Update the event
      await prisma.financialEvent.update({
        where: { id: event.id },
        data: { marketplaceId: order.marketplaceId }
      });

      updated++;
      const oldMp = event.marketplaceId || 'NULL';
      const newMp = order.marketplaceId;
      const key = `${oldMp} → ${newMp}`;
      updates[key] = (updates[key] || 0) + 1;

      if (updated % 100 === 0) {
        console.log(`  Updated ${updated} events...`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Update completed!`);
  console.log(`   Events updated: ${updated}`);
  console.log(`   Events skipped (already correct): ${skipped}`);

  if (Object.keys(updates).length > 0) {
    console.log('\n📊 Changes breakdown:');
    Object.entries(updates).forEach(([change, count]) => {
      console.log(`   ${change}: ${count} events`);
    });
  }

  // Check final distribution
  console.log('\n📈 Final marketplace distribution:\n');

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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
