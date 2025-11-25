import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function monitor() {
  const result = await prisma.$queryRaw<Array<{
    marketplaceId: string;
    count: bigint;
  }>>`
    SELECT marketplaceId, COUNT(*) as count
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

  const total = await prisma.order.count({ where: { accountId: 'cmggmot2a0005g9362659z7xx' } });

  console.log('\n📊 Progresso attuale:\n');
  result.forEach(r => {
    const name = names[r.marketplaceId] || r.marketplaceId;
    console.log(`  ${name.padEnd(12)}: ${Number(r.count)} ordini`);
  });
  console.log(`\n  TOTALE: ${total} / 2493 ordini (${((total/2493)*100).toFixed(1)}%)\n`);
}

monitor().then(() => process.exit(0)).catch(console.error);
