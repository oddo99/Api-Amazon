import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('📊 ORDINI per marketplace:\n');

  const orders = await prisma.order.findMany({
    where: { accountId: 'cmggmot2a0005g9362659z7xx' },
    select: { marketplaceId: true, totalAmount: true, purchaseDate: true }
  });

  const byMp: Record<string, { count: number; total: number; latest: Date }> = {};

  orders.forEach(o => {
    if (!byMp[o.marketplaceId]) {
      byMp[o.marketplaceId] = { count: 0, total: 0, latest: o.purchaseDate };
    }
    byMp[o.marketplaceId].count++;
    byMp[o.marketplaceId].total += o.totalAmount;
    if (o.purchaseDate > byMp[o.marketplaceId].latest) {
      byMp[o.marketplaceId].latest = o.purchaseDate;
    }
  });

  const names: Record<string, string> = {
    'A1PA6795UKMFR9': 'Germany',
    'A13V1IB3VIYZZH': 'France',
    'APJ6JRA9NG5V4': 'Italy',
    'A1RKKUPIHCS9HS': 'Spain',
    'A1805IZSGTT6HS': 'Netherlands',
  };

  Object.entries(byMp).forEach(([mpId, data]) => {
    const name = names[mpId] || mpId;
    console.log(`${name.padEnd(12)}: ${data.count} ordini, €${data.total.toFixed(2)}, ultimo: ${data.latest.toISOString().split('T')[0]}`);
  });

  console.log('\n📊 EVENTI FINANZIARI per marketplace:\n');

  const events = await prisma.financialEvent.findMany({
    where: {
      accountId: 'cmggmot2a0005g9362659z7xx',
      eventType: 'OrderRevenue'
    },
    select: { marketplaceId: true, amount: true }
  });

  const eventsByMp: Record<string, { count: number; total: number }> = {};

  events.forEach(e => {
    const mpId = e.marketplaceId || 'NULL';
    if (!eventsByMp[mpId]) {
      eventsByMp[mpId] = { count: 0, total: 0 };
    }
    eventsByMp[mpId].count++;
    eventsByMp[mpId].total += e.amount;
  });

  Object.entries(eventsByMp).forEach(([mpId, data]) => {
    const name = names[mpId] || mpId;
    console.log(`${name.padEnd(12)}: ${data.count} revenue events, €${data.total.toFixed(2)}`);
  });

  // Test filtering like the dashboard does
  console.log('\n🧪 TEST FILTRO Germania (come fa la dashboard):\n');

  const germanyOrders = await prisma.order.findMany({
    where: {
      accountId: 'cmggmot2a0005g9362659z7xx',
      marketplaceId: 'A1PA6795UKMFR9'
    }
  });

  console.log(`Ordini Germania trovati: ${germanyOrders.length}`);

  const germanyEvents = await prisma.financialEvent.findMany({
    where: {
      accountId: 'cmggmot2a0005g9362659z7xx',
      marketplaceId: 'A1PA6795UKMFR9',
      eventType: 'OrderRevenue'
    }
  });

  const germanyRevenue = germanyEvents.reduce((sum, e) => sum + e.amount, 0);
  console.log(`Revenue Germania: €${germanyRevenue.toFixed(2)} (${germanyEvents.length} eventi)`);
}

check().then(() => process.exit(0)).catch(console.error);
