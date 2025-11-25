const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
  const marketplaceNames = {
    'A1F83G8C2ARO7P': 'UK',
    'A1PA6795UKMFR9': 'Germany',
    'A13V1IB3VIYZZH': 'France',
    'APJ6JRA9NG5V4': 'Italy',
    'A1RKKUPIHCS9HS': 'Spain',
    'A1805IZSGTT6HS': 'Netherlands',
  };

  console.log('📊 STATO ATTUALE DATABASE\n');

  // Orders by marketplace
  const ordersByMp = await prisma.$queryRaw`
    SELECT marketplaceId, COUNT(*) as count,
           MIN(purchaseDate) as oldest,
           MAX(purchaseDate) as newest
    FROM \`Order\`
    WHERE accountId = 'cmggmot2a0005g9362659z7xx'
    GROUP BY marketplaceId
    ORDER BY count DESC
  `;

  console.log('ORDINI per marketplace:');
  ordersByMp.forEach(m => {
    const name = marketplaceNames[m.marketplaceId] || m.marketplaceId;
    const oldest = new Date(m.oldest).toISOString().split('T')[0];
    const newest = new Date(m.newest).toISOString().split('T')[0];
    console.log(`  ${name.padEnd(12)}: ${String(m.count).padStart(4)} ordini  (${oldest} → ${newest})`);
  });

  const totalOrders = await prisma.order.count();
  console.log(`\n  TOTALE: ${totalOrders} ordini\n`);

  // Financial events by marketplace
  const financesByMp = await prisma.$queryRaw`
    SELECT marketplaceId, COUNT(*) as count,
           MIN(postedDate) as oldest,
           MAX(postedDate) as newest
    FROM FinancialEvent
    WHERE accountId = 'cmggmot2a0005g9362659z7xx'
    AND marketplaceId IS NOT NULL
    GROUP BY marketplaceId
    ORDER BY count DESC
  `;

  console.log('EVENTI FINANZIARI per marketplace:');
  if (financesByMp.length > 0) {
    financesByMp.forEach(m => {
      const name = marketplaceNames[m.marketplaceId] || m.marketplaceId;
      const oldest = new Date(m.oldest).toISOString().split('T')[0];
      const newest = new Date(m.newest).toISOString().split('T')[0];
      console.log(`  ${name.padEnd(12)}: ${String(m.count).padStart(5)} eventi  (${oldest} → ${newest})`);
    });
  } else {
    console.log('  Nessun evento finanziario trovato');
  }

  const totalFinances = await prisma.financialEvent.count();
  console.log(`\n  TOTALE: ${totalFinances} eventi finanziari\n`);

  // Check if we have orders without financial events
  const marketplacesWithOrders = ordersByMp.map(m => m.marketplaceId);
  const marketplacesWithFinances = financesByMp.map(m => m.marketplaceId);

  const missingFinances = marketplacesWithOrders.filter(mp => !marketplacesWithFinances.includes(mp));

  if (missingFinances.length > 0) {
    console.log('⚠️  MARKETPLACE CON ORDINI MA SENZA DATI FINANZIARI:');
    missingFinances.forEach(mp => {
      console.log(`  - ${marketplaceNames[mp]}`);
    });
    console.log('\n💡 Questi marketplace hanno bisogno di sincronizzare i dati finanziari');
  } else {
    console.log('✅ Tutti i marketplace con ordini hanno anche dati finanziari');
  }

  await prisma.$disconnect();
}

checkStatus().catch(console.error);
