// Test fetching orders from a single marketplace
import { PrismaClient } from '@prisma/client';
import SPAPIService from './src/services/spapi.service';

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  // Test different marketplaces
  const marketplaces = [
    { id: 'A1F83G8C2ARO7P', name: 'UK', currency: 'GBP' },
    { id: 'A1PA6795UKMFR9', name: 'Germany', currency: 'EUR' },
    { id: 'A13V1IB3VIYZZH', name: 'France', currency: 'EUR' },
    { id: 'APJ6JRA9NG5V4', name: 'Italy', currency: 'EUR' },
    { id: 'A1RKKUPIHCS9HS', name: 'Spain', currency: 'EUR' },
    { id: 'A1805IZSGTT6HS', name: 'Netherlands', currency: 'EUR' },
  ];

  const spapi = new SPAPIService(accountId);

  const today = new Date();
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

  console.log('=== TESTING SINGLE MARKETPLACE REQUESTS ===\n');
  console.log(`Date range: ${sixtyDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}\n`);

  const results: Record<string, number> = {};

  for (const mp of marketplaces) {
    try {
      console.log(`Testing ${mp.name} (${mp.id})...`);

      const response = await spapi.getOrders({
        CreatedAfter: sixtyDaysAgo.toISOString(),
        MarketplaceIds: [mp.id],  // Single marketplace
      });

      const orderCount = response.Orders?.length || 0;
      results[mp.name] = orderCount;

      console.log(`   ✅ ${orderCount} orders found`);

      // Show sample order if available
      if (orderCount > 0 && response.Orders) {
        const sample = response.Orders[0];
        console.log(`   📦 Sample: ${sample.AmazonOrderId} - ${sample.PurchaseDate}`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      results[mp.name] = -1;
    }

    console.log('');
  }

  console.log('=== SUMMARY ===\n');
  console.log('Orders found per marketplace (last 60 days):');
  Object.entries(results).forEach(([name, count]) => {
    const status = count === -1 ? '❌ ERROR' : `${count} orders`;
    console.log(`  ${name.padEnd(12)}: ${status}`);
  });

  const total = Object.values(results).filter(c => c >= 0).reduce((sum, c) => sum + c, 0);
  console.log(`\nTotal: ${total} orders`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
