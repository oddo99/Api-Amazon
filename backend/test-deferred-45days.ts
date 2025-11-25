import { PrismaClient } from '@prisma/client';
import SPAPIService from './src/services/spapi.service';

const prisma = new PrismaClient();

(async () => {
  try {
    const account = await prisma.account.findFirst();
    if (!account) {
      console.log('No account found');
      return;
    }

    const spapi = new SPAPIService(account.id);

    // Test with 45 days to include Sept 24
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 45);

    console.log('Testing Finances API v2024-06-19 for DEFERRED transactions (45 days)...');
    console.log('From:', startDate.toISOString().split('T')[0]);
    console.log('');

    const response = await spapi.listTransactions({
      postedAfter: startDate.toISOString(),
      transactionStatus: 'DEFERRED'
    });

    const transactions = response.transactions || [];
    console.log(`Total deferred transactions found: ${transactions.length}`);
    console.log('');

    // Search for specific orders
    const searchOrders = ['028-2309989-9629944', '304-8684160-0970729'];

    for (const searchOrder of searchOrders) {
      const found = transactions.find((t: any) => {
        const orderIdIdentifier = t.relatedIdentifiers?.find(
          (id: any) => id.relatedIdentifierName === 'ORDER_ID'
        );
        return orderIdIdentifier?.relatedIdentifierValue === searchOrder;
      });

      if (found) {
        console.log(`✅ Found ${searchOrder}:`);
        console.log('   Posted Date:', found.postedDate);
        console.log('   Total Amount:', found.totalAmount?.currencyAmount, found.totalAmount?.currencyCode);
        console.log('   Status:', found.transactionStatus);
        console.log('');
      } else {
        console.log(`❌ ${searchOrder} NOT found in deferred transactions`);
        console.log('');
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
