// Sync financial events for an account
async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: npx tsx sync-finances.js <accountId> [sellingPartnerId]');
    process.exit(1);
  }

  const accountId = process.argv[2];
  const sellingPartnerId = process.argv[3];

  console.log(`Starting financial events sync for account ${accountId}...`);

  try {
    const { syncFinances } = await import('./src/jobs/sync.direct.js');
    const result = await syncFinances(accountId, sellingPartnerId);
    console.log('✅ Sync completed successfully!');
    console.log(`📊 Processed ${result.eventsProcessed} financial events`);
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

main();