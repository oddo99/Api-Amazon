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

    // Test the new listTransactions API
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log('Testing Finances API v2024-06-19 for DEFERRED transactions...');
    console.log('From:', startDate.toISOString().split('T')[0]);
    console.log('');

    const response = await spapi.listTransactions({
      postedAfter: startDate.toISOString(),
      transactionStatus: 'DEFERRED'
    });

    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('');

    const transactions = response.transactions || [];
    console.log(`Total deferred transactions found: ${transactions.length}`);

    if (transactions.length > 0) {
      console.log('');
      console.log('Sample deferred transactions:');
      transactions.slice(0, 5).forEach((t: any) => {
        console.log('  Transaction ID:', t.transactionId);
        console.log('  Posted Date:', t.postedDate);
        console.log('  Status:', t.transactionStatus);
        console.log('  Amount:', t.totalAmount?.amount, t.totalAmount?.currencyCode);
        console.log('  Order ID:', t.relatedIdentifiers?.amazonOrderId || 'N/A');
        console.log('  Description:', t.description);
        console.log('  ---');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
