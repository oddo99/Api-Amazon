import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Check Germany orders date range
  const germanyOrders = await prisma.order.findMany({
    where: {
      accountId: 'cmggmot2a0005g9362659z7xx',
      marketplaceId: 'A1PA6795UKMFR9'
    },
    orderBy: { purchaseDate: 'desc' },
    take: 10,
    select: {
      amazonOrderId: true,
      purchaseDate: true,
      totalAmount: true,
      orderStatus: true
    }
  });

  const total = await prisma.order.count({
    where: {
      accountId: 'cmggmot2a0005g9362659z7xx',
      marketplaceId: 'A1PA6795UKMFR9'
    }
  });

  console.log('\n🇩🇪 GERMANIA - Ultimi 10 ordini:\n');
  console.log(`Totale ordini: ${total}\n`);

  germanyOrders.forEach(o => {
    const date = o.purchaseDate.toISOString().split('T')[0];
    console.log(`${date} | ${o.amazonOrderId} | €${o.totalAmount.toFixed(2)} | ${o.orderStatus}`);
  });

  // Check oldest and newest
  const stats = await prisma.$queryRaw<Array<{
    oldest: Date;
    newest: Date;
    count: bigint;
  }>>`
    SELECT
      MIN(purchaseDate) as oldest,
      MAX(purchaseDate) as newest,
      COUNT(*) as count
    FROM \`Order\`
    WHERE accountId = 'cmggmot2a0005g9362659z7xx'
      AND marketplaceId = 'A1PA6795UKMFR9'
  `;

  if (stats[0]) {
    const oldest = new Date(stats[0].oldest).toISOString().split('T')[0];
    const newest = new Date(stats[0].newest).toISOString().split('T')[0];
    console.log(`\n📅 Range: ${oldest} → ${newest}`);
  }
}

check().then(() => process.exit(0)).catch(console.error);
