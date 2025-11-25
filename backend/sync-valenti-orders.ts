import { OrderService } from './src/services/order.service';

const VALENTI_ACCOUNT_ID = 'cmgpgl4dt01e63nj3ptbfommh';
const VALENTI_SELLER_ID = 'A31DH0MV4B261N';

async function syncValentiOrders() {
  console.log('🔄 Starting manual order sync for Valenti account...');
  console.log(`   Account ID: ${VALENTI_ACCOUNT_ID}`);
  console.log(`   Seller ID: ${VALENTI_SELLER_ID}`);
  console.log(`   Days back: 30\n`);

  try {
    const orderService = new OrderService(VALENTI_ACCOUNT_ID, VALENTI_SELLER_ID);
    const result = await orderService.syncOrders(VALENTI_ACCOUNT_ID, 30, VALENTI_SELLER_ID);

    console.log('\n✅ Sync completed successfully!');
    console.log(`   Orders processed: ${result.ordersProcessed}`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

syncValentiOrders();
