import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

let previousTotal = 0;
let stableCount = 0;

async function check() {
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

  const time = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`\n[${time}] 📊 Totale: ${total} ordini`);

  result.forEach(r => {
    const name = names[r.marketplaceId] || r.marketplaceId;
    console.log(`  ${name.padEnd(12)}: ${Number(r.count)}`);
  });

  // Check if stable
  if (total === previousTotal) {
    stableCount++;
    if (stableCount >= 3) {
      console.log('\n✅ SYNC COMPLETATO! (nessun cambiamento negli ultimi 30 sec)\n');

      // Show final stats
      const stats = await prisma.$queryRaw<Array<{
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

      console.log('📅 Range date finali:\n');
      stats.forEach(s => {
        const name = names[s.marketplaceId] || s.marketplaceId;
        const oldest = new Date(s.oldest).toISOString().split('T')[0];
        const newest = new Date(s.newest).toISOString().split('T')[0];
        console.log(`  ${name.padEnd(12)}: ${oldest} → ${newest} (${Number(s.count)} ordini)`);
      });

      process.exit(0);
    }
  } else {
    stableCount = 0;
    const diff = total - previousTotal;
    console.log(`  (+${diff} nuovi ordini)`);
  }

  previousTotal = total;
}

console.log('🔍 Monitoraggio sync in corso... (ctrl+c per fermare)\n');

// Check every 10 seconds
setInterval(check, 10000);
check();
