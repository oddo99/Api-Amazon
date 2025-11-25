import { PrismaClient } from '@prisma/client';
import FinanceService from './src/services/finance.service';

const prisma = new PrismaClient();

async function testOctoberSync() {
  const accountId = 'cmggmot2a0005g9362659z7xx';
  
  console.log('🧪 Testing October 2024 Financial Events Sync\n');
  
  try {
    // Get account info
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      console.log('❌ Account not found');
      return;
    }
    
    console.log(`✅ Account found: ${account.sellerName || account.id}`);
    console.log(`   Marketplace: ${account.marketplaceId}`);
    console.log(`   Seller ID: ${account.sellerId}\n`);
    
    // Test specific date range for October 1-15, 2024
    const financeService = new FinanceService(accountId);
    
    console.log('📅 Testing sync for October 1-15, 2024...\n');
    
    const result = await financeService.syncFinancialEvents(
      accountId, 
      730, // daysBack (will be limited by retention period)
      account.sellingPartnerId,
      {
        from: '2024-10-01T00:00:00Z',
        to: '2024-10-15T23:59:59Z'
      }
    );
    
    console.log(`\n✅ Sync completed successfully!`);
    console.log(`   Events processed: ${result.eventsProcessed}`);
    
    // Check what was actually synced
    console.log('\n📊 Checking synced data...\n');
    
    const events = await prisma.financialEvent.findMany({
      where: {
        accountId,
        postedDate: {
          gte: new Date('2024-10-01T00:00:00Z'),
          lte: new Date('2024-10-15T23:59:59Z')
        }
      },
      orderBy: { postedDate: 'asc' },
      take: 20
    });
    
    console.log(`Found ${events.length} financial events for October 1-15, 2024:`);
    events.forEach(event => {
      const date = event.postedDate.toISOString().split('T')[0];
      console.log(`  - ${event.amazonOrderId || 'N/A'} | ${date} | ${event.eventType} | ${event.amount} ${event.currency}`);
    });
    
    // Check for specific orders that were missing
    const testOrders = ['028-2309989-9629944', '304-8684160-0970729'];
    console.log('\n🔍 Checking for specific test orders...\n');
    
    for (const orderId of testOrders) {
      const orderEvents = await prisma.financialEvent.findMany({
        where: {
          accountId,
          amazonOrderId: orderId
        }
      });
      
      if (orderEvents.length > 0) {
        console.log(`✅ ${orderId}: Found ${orderEvents.length} financial events`);
        orderEvents.forEach(event => {
          const date = event.postedDate.toISOString().split('T')[0];
          console.log(`     ${date} | ${event.eventType} | ${event.amount} ${event.currency}`);
        });
      } else {
        console.log(`❌ ${orderId}: No financial events found`);
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ Error during sync:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testOctoberSync();