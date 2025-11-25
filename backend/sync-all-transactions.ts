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

    // Delete old DeferredTransaction events
    console.log('🗑️  Deleting old DeferredTransaction events...');
    const deleted = await prisma.financialEvent.deleteMany({
      where: { eventType: 'DeferredTransaction' }
    });
    console.log(`   Deleted ${deleted.count} old events`);
    console.log('');

    console.log('🔄 Starting ALL transactions sync for account:', account.id);
    console.log('');

    const financeService = new FinanceService(account.id);
    const result = await financeService.syncAllTransactions(account.id, 45);

    console.log('');
    console.log('✅ Sync completed successfully!');
    console.log('Result:', result);

    // Check if the missing orders now exist in the database
    console.log('');
    console.log('🔍 Checking for previously missing orders...');

    const missingOrders = ['028-2309989-9629944', '304-8684160-0970729', '304-2216059-3290743', '306-5361600-3434713'];

    for (const orderId of missingOrders) {
      const events = await prisma.financialEvent.findMany({
        where: { amazonOrderId: orderId },
        orderBy: { eventType: 'asc' }
      });

      if (events.length > 0) {
        console.log(`✅ ${orderId}: Found ${events.length} financial event(s)`);

        const revenue = events.filter(e => e.eventType === 'OrderRevenue').reduce((sum, e) => sum + e.amount, 0);
        const fees = events.filter(e => e.eventType === 'Fee').reduce((sum, e) => sum + Math.abs(e.amount), 0);
        const profit = revenue - fees;

        console.log(`   Revenue: ${revenue.toFixed(2)} EUR`);
        console.log(`   Fees: ${fees.toFixed(2)} EUR`);
        console.log(`   Profit: ${profit.toFixed(2)} EUR`);
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
