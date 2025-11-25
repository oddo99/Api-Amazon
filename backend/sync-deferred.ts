import { PrismaClient } from '@prisma/client';
import { FinanceService } from './src/services/finance.service';

const prisma = new PrismaClient();

(async () => {
  try {
    const account = await prisma.account.findFirst();
    if (!account) {
      console.log('No account found');
      return;
    }

    console.log('🔄 Starting deferred transactions sync for account:', account.id);
    console.log('');

    const financeService = new FinanceService(account.id);
    const result = await financeService.syncDeferredTransactions(account.id, 30);

    console.log('');
    console.log('✅ Sync completed successfully!');
    console.log('Result:', result);

    // Check if the missing orders now exist in the database
    console.log('');
    console.log('🔍 Checking for previously missing orders...');

    const missingOrders = ['304-2216059-3290743', '306-5361600-3434713'];

    for (const orderId of missingOrders) {
      const events = await prisma.financialEvent.findMany({
        where: { amazonOrderId: orderId }
      });

      if (events.length > 0) {
        console.log(`✅ ${orderId}: Found ${events.length} financial event(s)`);
        events.forEach(e => {
          console.log(`   - ${e.eventType}: ${e.amount} ${e.currency} (${e.postedDate.toISOString().split('T')[0]})`);
        });
      } else {
        console.log(`❌ ${orderId}: Still not found`);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
