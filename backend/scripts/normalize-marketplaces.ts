import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mappa di conversione: legacy format -> official Amazon Marketplace ID
const marketplaceMapping: Record<string, string> = {
  // Italia
  'Amazon.it': 'APJ6JRA9NG5V4',
  'amazon.it': 'APJ6JRA9NG5V4',
  // Germania
  'Amazon.de': 'A1PA6795UKMFR9',
  'amazon.de': 'A1PA6795UKMFR9',
  // Francia
  'Amazon.fr': 'A13V1IB3VIYZZH',
  'amazon.fr': 'A13V1IB3VIYZZH',
  // Spagna
  'Amazon.es': 'A1RKKUPIHCS9HS',
  'amazon.es': 'A1RKKUPIHCS9HS',
  // Regno Unito
  'Amazon.co.uk': 'A1F83G8C2ARO7P',
  'amazon.co.uk': 'A1F83G8C2ARO7P',
  // Paesi Bassi
  'Amazon.nl': 'A1805IZSGTT6HS',
  'amazon.nl': 'A1805IZSGTT6HS',
  // Polonia
  'Amazon.pl': 'A1C3SOZRARQ6R3',
  'amazon.pl': 'A1C3SOZRARQ6R3',
  // Stati Uniti
  'Amazon.com': 'ATVPDKIKX0DER',
  'amazon.com': 'ATVPDKIKX0DER',
  // Belgio (usa marketplace NL)
  'Amazon.com.be': 'A1805IZSGTT6HS',
  'amazon.com.be': 'A1805IZSGTT6HS',
  // Svezia
  'Amazon.se': 'A2NODRKZP88ZB9',
  'amazon.se': 'A2NODRKZP88ZB9',
};

async function normalizeMarketplaceIds() {
  console.log('Normalizzazione marketplace IDs nel database...\n');

  let totalUpdated = 0;

  // 1. Account
  console.log('Aggiornamento Account...');
  for (const [legacy, official] of Object.entries(marketplaceMapping)) {
    const result = await prisma.account.updateMany({
      where: { marketplaceId: legacy },
      data: { marketplaceId: official },
    });
    if (result.count > 0) {
      console.log(`  Account: ${legacy} -> ${official} (${result.count} record)`);
      totalUpdated += result.count;
    }
  }

  // 2. ClientAccount
  console.log('Aggiornamento ClientAccount...');
  for (const [legacy, official] of Object.entries(marketplaceMapping)) {
    const result = await prisma.clientAccount.updateMany({
      where: { marketplaceId: legacy },
      data: { marketplaceId: official },
    });
    if (result.count > 0) {
      console.log(`  ClientAccount: ${legacy} -> ${official} (${result.count} record)`);
      totalUpdated += result.count;
    }
  }

  // 3. Order
  console.log('Aggiornamento Order...');
  for (const [legacy, official] of Object.entries(marketplaceMapping)) {
    const result = await prisma.order.updateMany({
      where: { marketplaceId: legacy },
      data: { marketplaceId: official },
    });
    if (result.count > 0) {
      console.log(`  Order: ${legacy} -> ${official} (${result.count} record)`);
      totalUpdated += result.count;
    }
  }

  // 4. Product
  console.log('Aggiornamento Product...');
  for (const [legacy, official] of Object.entries(marketplaceMapping)) {
    const result = await prisma.product.updateMany({
      where: { marketplaceId: legacy },
      data: { marketplaceId: official },
    });
    if (result.count > 0) {
      console.log(`  Product: ${legacy} -> ${official} (${result.count} record)`);
      totalUpdated += result.count;
    }
  }

  // 5. FinancialEvent
  console.log('Aggiornamento FinancialEvent...');
  for (const [legacy, official] of Object.entries(marketplaceMapping)) {
    const result = await prisma.financialEvent.updateMany({
      where: { marketplaceId: legacy },
      data: { marketplaceId: official },
    });
    if (result.count > 0) {
      console.log(`  FinancialEvent: ${legacy} -> ${official} (${result.count} record)`);
      totalUpdated += result.count;
    }
  }

  // 6. Inventory
  console.log('Aggiornamento Inventory...');
  for (const [legacy, official] of Object.entries(marketplaceMapping)) {
    const result = await prisma.inventory.updateMany({
      where: { marketplaceId: legacy },
      data: { marketplaceId: official },
    });
    if (result.count > 0) {
      console.log(`  Inventory: ${legacy} -> ${official} (${result.count} record)`);
      totalUpdated += result.count;
    }
  }

  // 7. AdMetrics
  console.log('Aggiornamento AdMetrics...');
  for (const [legacy, official] of Object.entries(marketplaceMapping)) {
    const result = await prisma.adMetrics.updateMany({
      where: { marketplaceId: legacy },
      data: { marketplaceId: official },
    });
    if (result.count > 0) {
      console.log(`  AdMetrics: ${legacy} -> ${official} (${result.count} record)`);
      totalUpdated += result.count;
    }
  }

  // 8. SalesTrafficMetric
  console.log('Aggiornamento SalesTrafficMetric...');
  for (const [legacy, official] of Object.entries(marketplaceMapping)) {
    const result = await prisma.salesTrafficMetric.updateMany({
      where: { marketplaceId: legacy },
      data: { marketplaceId: official },
    });
    if (result.count > 0) {
      console.log(`  SalesTrafficMetric: ${legacy} -> ${official} (${result.count} record)`);
      totalUpdated += result.count;
    }
  }

  console.log(`\nNormalizzazione completata! Totale record aggiornati: ${totalUpdated}\n`);

  // Verifica finale
  console.log('Verifica marketplace IDs rimanenti...');
  const orders = await prisma.order.findMany({
    select: { marketplaceId: true },
    distinct: ['marketplaceId'],
  });
  console.log('Order marketplace IDs:', orders.map(o => o.marketplaceId));

  await prisma.$disconnect();
}

normalizeMarketplaceIds().catch((error) => {
  console.error('Errore:', error);
  prisma.$disconnect();
  process.exit(1);
});
