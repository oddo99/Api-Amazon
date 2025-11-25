const { PrismaClient } = require('@prisma/client');
const SPAPIService = require('./src/services/spapi.service').default;
const prisma = new PrismaClient();

(async () => {
  try {
    const account = await prisma.account.findFirst();
    if (!account) {
      console.log('No account found');
      return;
    }

    const spapi = new SPAPIService(account.id);

    // Get financial events for the last 7 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log('Fetching financial events from', startDate.toISOString());
    console.log('');

    const response = await spapi.listFinancialEvents({
      PostedAfter: startDate.toISOString(),
      MaxResultsPerPage: 10,
    });

    const shipments = response.FinancialEvents?.ShipmentEventList || [];
    if (shipments.length === 0) {
      console.log('No shipments found');
      return;
    }

    const shipment = shipments[0];
    console.log('📦 Order:', shipment.AmazonOrderId);
    console.log('Posted Date:', shipment.PostedDate);
    console.log('');

    const item = shipment.ShipmentItemList[0];
    console.log('Item SKU:', item.SellerSKU);
    console.log('');

    console.log('ItemChargeList:');
    item.ItemChargeList.forEach(charge => {
      console.log('  ', charge.ChargeType, ':', charge.ChargeAmount.CurrencyAmount, charge.ChargeAmount.CurrencyCode);
    });

    console.log('');
    console.log('ItemFeeList:');
    item.ItemFeeList.forEach(fee => {
      console.log('  ', fee.FeeType, ':', fee.FeeAmount.CurrencyAmount, fee.FeeAmount.CurrencyCode);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
