// Sync recent financial events (last 90 days)
const { PrismaClient } = require('@prisma/client');
const { subDays } = require('date-fns');

const prisma = new PrismaClient();

async function syncRecentFinances(accountId, daysBack = 90) {
  try {
    // Import the direct sync function
    const { syncFinances } = await import('./src/jobs/sync.direct.js');

    console.log(`\n🔄 Attempting to sync financial events for last ${daysBack} days...`);
    console.log(`   Period: ${subDays(new Date(), daysBack).toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}\n`);

    // This will use the service which requests data from Amazon
    const result = await syncFinances(accountId);

    console.log('\n✅ Sync completed!');
    console.log(`📊 Events processed: ${result.eventsProcessed}`);

    return result;
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

async function main() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('=== RECENT FINANCIAL DATA SYNC ===');
  console.log(`Account ID: ${accountId}\n`);

  // First, check current state
  const currentNewest = await prisma.financialEvent.findFirst({
    orderBy: { postedDate: 'desc' },
    select: { postedDate: true },
  });

  console.log(`Current newest financial event: ${currentNewest?.postedDate.toISOString().split('T')[0] || 'None'}`);

  // Try to sync
  await syncRecentFinances(accountId, 90);

  // Check new state
  const newNewest = await prisma.financialEvent.findFirst({
    orderBy: { postedDate: 'desc' },
    select: { postedDate: true },
  });

  console.log(`\nAfter sync - newest event: ${newNewest?.postedDate.toISOString().split('T')[0]}`);

  if (newNewest?.postedDate > currentNewest?.postedDate) {
    console.log('✅ New data was retrieved!');
  } else {
    console.log('⚠️  No new data - Amazon API may not have financial events after April 2024');
    console.log('   This could be due to:');
    console.log('   1. Amazon SP-API restrictions on financial data access');
    console.log('   2. No actual financial transactions after that date');
    console.log('   3. Account permissions or API access limitations');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
