import { PrismaClient } from '@prisma/client';
import SPAPIService from './src/services/spapi.service';

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🚀 Starting October orders test...');
    
    const account = await prisma.account.findFirst();
    if (!account) {
      console.log('❌ No account found');
      return;
    }
    
    console.log('✅ Account found:', account.id);

    const spapi = new SPAPIService(account.id);

    // Test per ordini di inizio ottobre 2024
    const startDate = new Date('2024-10-01');
    const endDate = new Date('2024-10-15');

    console.log('🔍 Testing Financial Events API for early October 2024...');
    console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log('');

    try {
      // Test Financial Events API
      console.log('📊 Testing Financial Events API...');
      const financialResponse = await spapi.listFinancialEvents({
        PostedAfter: startDate.toISOString(),
        PostedBefore: endDate.toISOString(),
        MaxResultsPerPage: 100,
      });

      const events = financialResponse.FinancialEvents || {};
      const shipments = events.ShipmentEventList || [];
      
      console.log(`Found ${shipments.length} shipment events in Financial Events API`);
      
      if (shipments.length > 0) {
        console.log('Sample orders from Financial Events:');
        shipments.slice(0, 5).forEach((shipment: any) => {
          console.log(`  - ${shipment.AmazonOrderId} | Posted: ${shipment.PostedDate?.split('T')[0]}`);
        });
      }
      console.log('');

    } catch (error: any) {
      console.error('❌ Error with Financial Events API:', error.message);
      console.log('');
    }

    try {
      // Test Transactions API - RELEASED
      console.log('💰 Testing Transactions API (RELEASED)...');
      const releasedResponse = await spapi.listTransactions({
        postedAfter: startDate.toISOString(),
        postedBefore: endDate.toISOString(),
        transactionStatus: 'RELEASED'
      });

      const releasedTransactions = releasedResponse.transactions || [];
      console.log(`Found ${releasedTransactions.length} RELEASED transactions`);
      
      if (releasedTransactions.length > 0) {
        console.log('Sample RELEASED transactions:');
        releasedTransactions.slice(0, 5).forEach((transaction: any) => {
          const orderIdIdentifier = transaction.relatedIdentifiers?.find(
            (id: any) => id.relatedIdentifierName === 'ORDER_ID'
          );
          const orderId = orderIdIdentifier?.relatedIdentifierValue || 'N/A';
          console.log(`  - ${orderId} | Posted: ${transaction.postedDate?.split('T')[0]} | Amount: ${transaction.totalAmount?.currencyAmount}`);
        });
      }
      console.log('');

    } catch (error: any) {
      console.error('❌ Error with Transactions API (RELEASED):', error.message);
      console.log('');
    }

    try {
      // Test Transactions API - DEFERRED_RELEASED
      console.log('⏳ Testing Transactions API (DEFERRED_RELEASED)...');
      const deferredResponse = await spapi.listTransactions({
        postedAfter: startDate.toISOString(),
        postedBefore: endDate.toISOString(),
        transactionStatus: 'DEFERRED_RELEASED'
      });

      const deferredTransactions = deferredResponse.transactions || [];
      console.log(`Found ${deferredTransactions.length} DEFERRED_RELEASED transactions`);
      
      if (deferredTransactions.length > 0) {
        console.log('Sample DEFERRED_RELEASED transactions:');
        deferredTransactions.slice(0, 5).forEach((transaction: any) => {
          const orderIdIdentifier = transaction.relatedIdentifiers?.find(
            (id: any) => id.relatedIdentifierName === 'ORDER_ID'
          );
          const orderId = orderIdIdentifier?.relatedIdentifierValue || 'N/A';
          console.log(`  - ${orderId} | Posted: ${transaction.postedDate?.split('T')[0]} | Amount: ${transaction.totalAmount?.currencyAmount}`);
        });
      }
      console.log('');

    } catch (error: any) {
      console.error('❌ Error with Transactions API (DEFERRED_RELEASED):', error.message);
      console.log('');
    }

    // Controlla nel database locale
    console.log('🗄️  Checking local database for October orders...');
    const localOrders = await prisma.order.findMany({
      where: {
        accountId: account.id,
        purchaseDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        amazonOrderId: true,
        purchaseDate: true,
        orderStatus: true
      },
      orderBy: {
        purchaseDate: 'desc'
      },
      take: 10
    });

    console.log(`Found ${localOrders.length} orders in local database for early October`);
    if (localOrders.length > 0) {
      console.log('Sample local orders:');
      localOrders.forEach(order => {
        console.log(`  - ${order.amazonOrderId} | Date: ${order.purchaseDate.toISOString().split('T')[0]} | Status: ${order.orderStatus}`);
      });
    }
    console.log('');

    // Controlla eventi finanziari nel database
    console.log('💸 Checking financial events in local database...');
    const financialEvents = await prisma.financialEvent.findMany({
      where: {
        accountId: account.id,
        postedDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        amazonOrderId: true,
        postedDate: true,
        eventType: true,
        amount: true
      },
      orderBy: {
        postedDate: 'desc'
      },
      take: 10
    });

    console.log(`Found ${financialEvents.length} financial events in local database for early October`);
    if (financialEvents.length > 0) {
      console.log('Sample financial events:');
      financialEvents.forEach(event => {
        console.log(`  - ${event.amazonOrderId} | Date: ${event.postedDate.toISOString().split('T')[0]} | Type: ${event.eventType} | Amount: ${event.amount}`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ General error:', error);
    await prisma.$disconnect();
  }
})();