// Check which marketplaces we have access to
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  // Import services
  const SPAPIService = (await import('./src/services/spapi.service.js')).default;

  console.log('=== CHECKING MARKETPLACE ACCESS ===\n');

  const spapi = new SPAPIService(accountId);

  // EU marketplaces
  const euMarketplaces = [
    { id: 'A1F83G8C2ARO7P', name: 'UK', currency: 'GBP' },
    { id: 'A1PA6795UKMFR9', name: 'Germany', currency: 'EUR' },
    { id: 'A13V1IB3VIYZZH', name: 'France', currency: 'EUR' },
    { id: 'APJ6JRA9NG5V4', name: 'Italy', currency: 'EUR' },
    { id: 'A1RKKUPIHCS9HS', name: 'Spain', currency: 'EUR' },
    { id: 'A1805IZSGTT6HS', name: 'Netherlands', currency: 'EUR' },
  ];

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    console.log('Fetching orders from all EU marketplaces (last 30 days)...\n');

    const response = await spapi.getOrders({
      CreatedAfter: thirtyDaysAgo.toISOString(),
      MarketplaceIds: euMarketplaces.map(m => m.id),
    });

    console.log(`✅ Total orders found: ${response.Orders?.length || 0}\n`);

    // Group by marketplace
    const byMarketplace = {};
    response.Orders?.forEach(order => {
      const mp = order.MarketplaceId;
      byMarketplace[mp] = (byMarketplace[mp] || 0) + 1;
    });

    console.log('Orders by marketplace:');
    euMarketplaces.forEach(mp => {
      const count = byMarketplace[mp.id] || 0;
      console.log(`  ${mp.name.padEnd(12)} (${mp.currency}): ${count} orders`);
    });

    console.log('\n📊 Marketplaces with data:');
    const activeMarketplaces = euMarketplaces.filter(mp => byMarketplace[mp.id] > 0);
    activeMarketplaces.forEach(mp => {
      console.log(`  ✓ ${mp.name} (${mp.id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
