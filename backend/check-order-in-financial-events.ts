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
    const searchOrders = ['028-2309989-9629944', '304-8684160-0970729'];

    console.log('Checking orders in Financial Events API (last 45 days)...');
    console.log('');

    // Check in Financial Events API
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 45);

    const response = await spapi.listFinancialEvents({
      PostedAfter: startDate.toISOString(),
      MaxResultsPerPage: 100,
    });

    const shipments = response.FinancialEvents?.ShipmentEventList || [];
    console.log(`Total shipments found: ${shipments.length}`);
    console.log('');

    for (const orderId of searchOrders) {
      const found = shipments.find((s: any) => s.AmazonOrderId === orderId);

      if (found) {
        console.log(`✅ ${orderId} found in ShipmentEventList:`);
        console.log('   Posted Date:', found.PostedDate);
        console.log('   Shipment ID:', found.ShipmentId);
        const item = found.ShipmentItemList?.[0];
        if (item) {
          console.log('   SKU:', item.SellerSKU);
          const revenue = item.ItemChargeList?.reduce((sum: number, c: any) =>
            sum + parseFloat(c.ChargeAmount?.CurrencyAmount || 0), 0);
          console.log('   Revenue:', revenue);
        }
        console.log('');
      } else {
        console.log(`❌ ${orderId} NOT in ShipmentEventList`);
        console.log('');
      }
    }

    // Check in new Transactions API with RELEASED status
    console.log('Checking in Transactions API with RELEASED status...');
    const releasedResponse = await spapi.listTransactions({
      postedAfter: startDate.toISOString(),
      transactionStatus: 'RELEASED'
    });

    const releasedTransactions = releasedResponse.transactions || [];
    console.log(`Total RELEASED transactions found: ${releasedTransactions.length}`);
    console.log('');

    for (const orderId of searchOrders) {
      const found = releasedTransactions.find((t: any) => {
        const orderIdIdentifier = t.relatedIdentifiers?.find(
          (id: any) => id.relatedIdentifierName === 'ORDER_ID'
        );
        return orderIdIdentifier?.relatedIdentifierValue === orderId;
      });

      if (found) {
        console.log(`✅ ${orderId} found in RELEASED transactions:`);
        console.log('   Posted Date:', found.postedDate);
        console.log('   Total Amount:', found.totalAmount?.currencyAmount, found.totalAmount?.currencyCode);
        console.log('');
      } else {
        console.log(`❌ ${orderId} NOT in RELEASED transactions`);
      }
    }

    // Check DEFERRED_RELEASED
    console.log('');
    console.log('Checking in Transactions API with DEFERRED_RELEASED status...');
    const deferredReleasedResponse = await spapi.listTransactions({
      postedAfter: startDate.toISOString(),
      transactionStatus: 'DEFERRED_RELEASED'
    });

    const deferredReleasedTransactions = deferredReleasedResponse.transactions || [];
    console.log(`Total DEFERRED_RELEASED transactions found: ${deferredReleasedTransactions.length}`);
    console.log('');

    for (const orderId of searchOrders) {
      const found = deferredReleasedTransactions.find((t: any) => {
        const orderIdIdentifier = t.relatedIdentifiers?.find(
          (id: any) => id.relatedIdentifierName === 'ORDER_ID'
        );
        return orderIdIdentifier?.relatedIdentifierValue === orderId;
      });

      if (found) {
        console.log(`✅ ${orderId} found in DEFERRED_RELEASED transactions:`);
        console.log('   Posted Date:', found.postedDate);
        console.log('   Total Amount:', found.totalAmount?.currencyAmount, found.totalAmount?.currencyCode);
        console.log('');
      } else {
        console.log(`❌ ${orderId} NOT in DEFERRED_RELEASED transactions`);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
