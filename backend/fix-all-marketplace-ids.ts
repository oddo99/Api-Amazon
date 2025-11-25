import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllMarketplaceIds() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('\n🔧 Fixing all financial events with wrong marketplace IDs...\n');

  // Get all financial events with an order ID
  const events = await prisma.financialEvent.findMany({
    where: {
      accountId,
      amazonOrderId: { not: null }
    },
    select: {
      id: true,
      amazonOrderId: true,
      marketplaceId: true
    }
  });

  console.log(`Found ${events.length} financial events with order IDs`);

  let updated = 0;
  let skipped = 0;

  for (const event of events) {
    // Find the order
    const order = await prisma.order.findUnique({
      where: { amazonOrderId: event.amazonOrderId! },
      select: { marketplaceId: true }
    });

    if (!order) {
      skipped++;
      continue;
    }

    // If marketplace doesn't match, update it
    if (order.marketplaceId !== event.marketplaceId) {
      await prisma.financialEvent.update({
        where: { id: event.id },
        data: { marketplaceId: order.marketplaceId }
      });
      updated++;

      if (updated % 100 === 0) {
        console.log(`  Updated ${updated} events...`);
      }
    }
  }

  console.log(`\n✅ Fixed ${updated} financial events`);
  console.log(`   Skipped ${skipped} events (order not found)`);

  // Show updated stats
  const allMarketplaces = ['A1PA6795UKMFR9', 'A13V1IB3VIYZZH', 'APJ6JRA9NG5V4', 'A1RKKUPIHCS9HS', 'A1805IZSGTT6HS'];

  console.log('\n📅 Updated Financial Events by Marketplace:\n');

  for (const mp of allMarketplaces) {
    const names: Record<string, string> = {
      'A1PA6795UKMFR9': 'Germany',
      'A13V1IB3VIYZZH': 'France',
      'APJ6JRA9NG5V4': 'Italy',
      'A1RKKUPIHCS9HS': 'Spain',
      'A1805IZSGTT6HS': 'Netherlands'
    };

    const result = await prisma.financialEvent.aggregate({
      where: {
        accountId,
        marketplaceId: mp
      },
      _max: {
        postedDate: true
      },
      _count: true
    });

    if (result._max.postedDate) {
      console.log(`  ${names[mp].padEnd(12)}: ${result._max.postedDate.toISOString().split('T')[0]} (total: ${result._count} events)`);
    }
  }

  await prisma.$disconnect();
}

fixAllMarketplaceIds().catch(console.error);
