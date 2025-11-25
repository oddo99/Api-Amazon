// Sync financial events by specific date range (2025 year)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('=== SYNC 2025 FINANCIAL DATA ===\n');

  // Import required modules
  const SPAPIService = await import('./src/services/spapi.service.js');
  const FinanceServiceModule = await import('./src/services/finance.service.js');

  // Get account info
  const account = await prisma.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error('Account not found');
  }

  console.log(`Account: ${account.sellerId}`);
  console.log(`Marketplace: ${account.marketplaceId}\n`);

  // Create service instance
  const spapiService = new SPAPIService.default(accountId);

  // Define date range for 2025
  const postedAfter = '2025-01-01T00:00:00Z';
  const postedBefore = '2025-12-31T23:59:59Z';

  console.log(`📅 Requesting financial events:`);
  console.log(`   From: ${postedAfter.split('T')[0]}`);
  console.log(`   To: ${postedBefore.split('T')[0]}\n`);

  let totalProcessed = 0;
  let nextToken = undefined;
  let pageCount = 0;

  try {
    // Loop through all pages
    do {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}...`);

      const response = await spapiService.listFinancialEvents({
        PostedAfter: postedAfter,
        PostedBefore: postedBefore,
        MaxResultsPerPage: 100,
        NextToken: nextToken,
      });

      const events = response.FinancialEvents || {};
      nextToken = response.NextToken;

      // Count events in this page
      let pageEvents = 0;
      if (events.ShipmentEventList) {
        pageEvents += events.ShipmentEventList.length;
      }
      if (events.RefundEventList) {
        pageEvents += events.RefundEventList.length;
      }
      if (events.ServiceFeeEventList) {
        pageEvents += events.ServiceFeeEventList.length;
      }

      console.log(`   Found ${pageEvents} events in this page`);
      totalProcessed += pageEvents;

      // Show sample events
      if (events.ShipmentEventList && events.ShipmentEventList.length > 0) {
        const sample = events.ShipmentEventList[0];
        console.log(`   Sample: Order ${sample.AmazonOrderId} - ${sample.PostedDate}`);
      }

    } while (nextToken);

    console.log(`\n✅ Total events found in 2025: ${totalProcessed}`);
    console.log(`📊 Pages processed: ${pageCount}`);

    if (totalProcessed === 0) {
      console.log('\n⚠️  No financial events found for 2025.');
      console.log('   Possible reasons:');
      console.log('   1. No transactions in 2025');
      console.log('   2. Financial data not yet available for this period');
      console.log('   3. API access restrictions');
    } else {
      console.log('\n💡 To import this data into database, use the sync endpoint.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
