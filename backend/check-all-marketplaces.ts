import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const marketplaces = [
    { id: 'A1RKKUPIHCS9HS', name: 'Spain' },
    { id: 'A13V1IB3VIYZZH', name: 'France' },
    { id: 'A1805IZSGTT6HS', name: 'Netherlands' },
  ];

  console.log('🔍 Checking for misplaced financial events\n');

  for (const mp of marketplaces) {
    // Get orders from this marketplace
    const orders = await prisma.order.findMany({
      where: {
        accountId: 'cmggmot2a0005g9362659z7xx',
        marketplaceId: mp.id
      },
      select: { amazonOrderId: true }
    });

    const orderIds = orders.map(o => o.amazonOrderId);

    if (orderIds.length === 0) {
      console.log(`${mp.name}: No orders found\n`);
      continue;
    }

    // Find all revenue events for these orders
    const allEvents = await prisma.financialEvent.findMany({
      where: {
        amazonOrderId: { in: orderIds },
        eventType: 'OrderRevenue'
      },
      select: { marketplaceId: true }
    });

    // Count by marketplace
    const byMp: Record<string, number> = {};
    allEvents.forEach(e => {
      const mpId = e.marketplaceId || 'NULL';
      byMp[mpId] = (byMp[mpId] || 0) + 1;
    });

    console.log(`${mp.name} (${mp.id}):`);
    console.log(`  Orders: ${orders.length}`);
    console.log(`  Revenue events:`);
    Object.entries(byMp).forEach(([mpId, count]) => {
      const correct = mpId === mp.id;
      const marker = correct ? '✅' : '❌';
      console.log(`    ${marker} ${mpId}: ${count} events`);
    });
    console.log('');
  }

  // Check date range for all marketplaces
  console.log('\n📅 Date range per marketplace:\n');

  const dateRanges = await prisma.$queryRaw<Array<{
    marketplaceId: string;
    oldest: Date;
    newest: Date;
    count: bigint;
  }>>`
    SELECT marketplaceId,
           MIN(purchaseDate) as oldest,
           MAX(purchaseDate) as newest,
           COUNT(*) as count
    FROM \`Order\`
    WHERE accountId = 'cmggmot2a0005g9362659z7xx'
    GROUP BY marketplaceId
  `;

  const names: Record<string, string> = {
    'A1PA6795UKMFR9': 'Germany',
    'A13V1IB3VIYZZH': 'France',
    'APJ6JRA9NG5V4': 'Italy',
    'A1RKKUPIHCS9HS': 'Spain',
    'A1805IZSGTT6HS': 'Netherlands',
  };

  dateRanges.forEach(r => {
    const name = names[r.marketplaceId] || r.marketplaceId;
    const oldest = new Date(r.oldest).toISOString().split('T')[0];
    const newest = new Date(r.newest).toISOString().split('T')[0];
    const count = Number(r.count);
    console.log(`${name.padEnd(12)}: ${oldest} → ${newest} (${count} orders)`);
  });
}

check().then(() => process.exit(0)).catch(console.error);
