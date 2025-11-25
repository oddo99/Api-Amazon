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

    // Get financial events for the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const searchOrder = process.argv[2] || '404-2187608-0745960';
    console.log('Searching for order', searchOrder, 'in financial events from', startDate.toISOString().split('T')[0]);
    console.log('');

    const response = await spapi.listFinancialEvents({
      PostedAfter: startDate.toISOString(),
      MaxResultsPerPage: 100,
    });

    const shipments = response.FinancialEvents?.ShipmentEventList || [];
    console.log(`Total shipments found: ${shipments.length}`);
    console.log('');

    const targetOrder = shipments.find(s => s.AmazonOrderId === searchOrder);

    if (targetOrder) {
      console.log('✅ FOUND on Amazon API!');
      console.log('📦 Order:', targetOrder.AmazonOrderId);
      console.log('Posted Date:', targetOrder.PostedDate);
      console.log('Shipment ID:', targetOrder.ShipmentId);
      console.log('');

      const item = targetOrder.ShipmentItemList[0];
      console.log('Item SKU:', item.SellerSKU);
      console.log('');

      console.log('ItemChargeList:');
      item.ItemChargeList.forEach((charge: any) => {
        console.log('  ', charge.ChargeType, ':', charge.ChargeAmount.CurrencyAmount, charge.ChargeAmount.CurrencyCode);
      });

      console.log('');
      console.log('ItemFeeList:');
      item.ItemFeeList.forEach((fee: any) => {
        console.log('  ', fee.FeeType, ':', fee.FeeAmount.CurrencyAmount, fee.FeeAmount.CurrencyCode);
      });
    } else {
      console.log('❌ NOT FOUND in Amazon Financial Events API');
      console.log('');
      console.log('This means Amazon has not yet released financial data for this order.');
      console.log('Financial events are typically posted 24-48 hours after shipment.');
      console.log('');
      console.log('Sample of recent orders with financial events:');
      shipments.slice(0, 5).forEach(s => {
        console.log(' -', s.AmazonOrderId, '| Posted:', s.PostedDate?.split('T')[0]);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
