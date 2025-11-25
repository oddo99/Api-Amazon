import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const ordersToFind = ['028-2309989-9629944', '304-8684160-0970729', '304-2216059-3290743', '306-5361600-3434713'];

    console.log('Searching in Orders table:');
    for (const orderId of ordersToFind) {
      const order = await prisma.order.findUnique({
        where: { amazonOrderId: orderId }
      });

      if (order) {
        console.log(`✅ ${orderId}:`);
        console.log(`   Status: ${order.orderStatus}`);
        console.log(`   Total: ${order.orderTotal} ${order.currency}`);
        console.log(`   Purchase Date: ${order.purchaseDate?.toISOString().split('T')[0]}`);
      } else {
        console.log(`❌ ${orderId}: Not found in Orders table`);
      }
    }

    console.log('');
    console.log('Searching in FinancialEvents table:');
    for (const orderId of ordersToFind) {
      const events = await prisma.financialEvent.findMany({
        where: { amazonOrderId: orderId }
      });

      if (events.length > 0) {
        console.log(`✅ ${orderId}: ${events.length} event(s)`);
        events.forEach(e => {
          console.log(`   - ${e.eventType}: ${e.amount} ${e.currency} (${e.postedDate.toISOString().split('T')[0]})`);
        });
      } else {
        console.log(`❌ ${orderId}: No financial events`);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
