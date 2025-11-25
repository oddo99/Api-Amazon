import ReportService from './src/services/report.service';

const VALENTI_ACCOUNT_ID = 'cmgpgl4dt01e63nj3ptbfommh';
const VALENTI_SELLER_ID = 'A31DH0MV4B261N';

const GRIFOS_ACCOUNT_ID = 'cmggmot2a0005g9362659z7xx';
const GRIFOS_SELLER_ID = 'A1JIEK7HZ5YRL';

/**
 * Sync 2025 orders using Reports API (MUCH FASTER!)
 *
 * Instead of calling getOrders + getOrderItems for each order (1000+ API calls),
 * this requests a single report from Amazon with all orders and items in CSV format.
 *
 * Flow:
 * 1. Request report (1 API call)
 * 2. Wait for Amazon to generate it (2-5 minutes)
 * 3. Download CSV (1 API call)
 * 4. Parse and save (fast local processing)
 *
 * Total: ~5-10 minutes instead of hours!
 */
async function sync2025OrdersViaReports() {
  const today = new Date();
  const jan1_2025 = new Date('2025-01-01');
  const daysSinceJan1 = Math.ceil((today.getTime() - jan1_2025.getTime()) / (1000 * 60 * 60 * 24));

  console.log('🚀 Syncing 2025 orders via Reports API (FAST METHOD)');
  console.log(`📅 Period: January 1, 2025 to ${today.toISOString().split('T')[0]}`);
  console.log(`⏱️  Days to sync: ${daysSinceJan1}\n`);

  // Sync Valenti
  console.log('=' .repeat(60));
  console.log('🏢 VALENTI - Reports API Sync');
  console.log('=' .repeat(60));
  console.log(`   Account ID: ${VALENTI_ACCOUNT_ID}`);
  console.log(`   Seller ID: ${VALENTI_SELLER_ID}\n`);

  try {
    const valentiService = new ReportService(VALENTI_ACCOUNT_ID, VALENTI_SELLER_ID);
    const valentiResult = await valentiService.syncOrdersViaReport(
      VALENTI_ACCOUNT_ID,
      daysSinceJan1,
      VALENTI_SELLER_ID
    );

    console.log('\n✅ Valenti sync completed!');
    console.log(`   Orders processed: ${valentiResult.ordersProcessed}`);
    console.log(`   Items processed: ${valentiResult.itemsProcessed}\n`);
  } catch (error) {
    console.error('\n❌ Valenti sync failed:', error);
  }

  // Sync Grifos
  console.log('\n' + '='.repeat(60));
  console.log('🏢 GRIFOS - Reports API Sync');
  console.log('='.repeat(60));
  console.log(`   Account ID: ${GRIFOS_ACCOUNT_ID}`);
  console.log(`   Seller ID: ${GRIFOS_SELLER_ID}\n`);

  try {
    const grifosService = new ReportService(GRIFOS_ACCOUNT_ID, GRIFOS_SELLER_ID);
    const grifosResult = await grifosService.syncOrdersViaReport(
      GRIFOS_ACCOUNT_ID,
      daysSinceJan1,
      GRIFOS_SELLER_ID
    );

    console.log('\n✅ Grifos sync completed!');
    console.log(`   Orders processed: ${grifosResult.ordersProcessed}`);
    console.log(`   Items processed: ${grifosResult.itemsProcessed}\n`);
  } catch (error) {
    console.error('\n❌ Grifos sync failed:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 2025 Reports Sync Completed!');
  console.log('💡 This method is 10-20x faster than Orders API');
  console.log('='.repeat(60));
}

sync2025OrdersViaReports();
