import { OrderService } from './src/services/order.service';

const VALENTI_ACCOUNT_ID = 'cmgpgl4dt01e63nj3ptbfommh';
const VALENTI_SELLER_ID = 'A31DH0MV4B261N';

const GRIFOS_ACCOUNT_ID = 'cmggmot2a0005g9362659z7xx';
const GRIFOS_SELLER_ID = 'A1JIEK7HZ5YRL';

async function sync2025Orders() {
  // Calculate days from January 1, 2025 to today
  const today = new Date();
  const jan1_2025 = new Date('2025-01-01');
  const daysSinceJan1 = Math.ceil((today.getTime() - jan1_2025.getTime()) / (1000 * 60 * 60 * 24));

  console.log('🔄 Syncing ALL 2025 orders (full year sync)');
  console.log(`📅 Period: January 1, 2025 to ${today.toISOString().split('T')[0]}`);
  console.log(`⏱️  Days to sync: ${daysSinceJan1}\n`);

  // Sync Valenti first (ha più ordini mancanti)
  console.log('=' .repeat(60));
  console.log('🏢 VALENTI - Full 2025 Sync');
  console.log('=' .repeat(60));
  console.log(`   Account ID: ${VALENTI_ACCOUNT_ID}`);
  console.log(`   Seller ID: ${VALENTI_SELLER_ID}\n`);

  try {
    const valentiService = new OrderService(VALENTI_ACCOUNT_ID, VALENTI_SELLER_ID);
    const valentiResult = await valentiService.syncOrders(VALENTI_ACCOUNT_ID, daysSinceJan1, VALENTI_SELLER_ID);

    console.log('\n✅ Valenti sync completed!');
    console.log(`   Orders processed: ${valentiResult.ordersProcessed}\n`);
  } catch (error) {
    console.error('\n❌ Valenti sync failed:', error);
  }

  // Sync Grifos (per verificare completezza)
  console.log('\n' + '='.repeat(60));
  console.log('🏢 GRIFOS - Full 2025 Sync');
  console.log('='.repeat(60));
  console.log(`   Account ID: ${GRIFOS_ACCOUNT_ID}`);
  console.log(`   Seller ID: ${GRIFOS_SELLER_ID}\n`);

  try {
    const grifosService = new OrderService(GRIFOS_ACCOUNT_ID, GRIFOS_SELLER_ID);
    const grifosResult = await grifosService.syncOrders(GRIFOS_ACCOUNT_ID, daysSinceJan1, GRIFOS_SELLER_ID);

    console.log('\n✅ Grifos sync completed!');
    console.log(`   Orders processed: ${grifosResult.ordersProcessed}\n`);
  } catch (error) {
    console.error('\n❌ Grifos sync failed:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 2025 Full Sync Completed!');
  console.log('='.repeat(60));
}

sync2025Orders();
