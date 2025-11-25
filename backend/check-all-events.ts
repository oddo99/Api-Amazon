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

    // Get financial events for the last 15 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 15);

    console.log('Fetching ALL financial event types from', startDate.toISOString().split('T')[0]);
    console.log('');

    const response = await spapi.listFinancialEvents({
      PostedAfter: startDate.toISOString(),
      MaxResultsPerPage: 100,
    });

    const events = response.FinancialEvents || {};

    console.log('Event types found:');
    console.log('');

    // Check all possible event types
    const eventTypes = [
      'ShipmentEventList',
      'RefundEventList',
      'GuaranteeClaimEventList',
      'ChargebackEventList',
      'PayWithAmazonEventList',
      'ServiceProviderCreditEventList',
      'RetrochargeEventList',
      'RentalTransactionEventList',
      'ProductAdsPaymentEventList',
      'ServiceFeeEventList',
      'SellerDealPaymentEventList',
      'DebtRecoveryEventList',
      'LoanServicingEventList',
      'AdjustmentEventList',
      'SAFETReimbursementEventList',
      'SellerReviewEnrollmentPaymentEventList',
      'FBALiquidationEventList',
      'CouponPaymentEventList',
      'ImagingServicesFeeEventList',
      'NetworkComminglingTransactionEventList',
      'AffordabilityExpenseEventList',
      'AffordabilityExpenseReversalEventList',
      'TrialShipmentEventList',
      'ShipmentSettleEventList',
      'TaxWithholdingEventList',
      'RemovalShipmentEventList',
      'RemovalShipmentAdjustmentEventList'
    ];

    for (const eventType of eventTypes) {
      if (events[eventType] && events[eventType].length > 0) {
        console.log(`✅ ${eventType}: ${events[eventType].length} events`);

        // Show sample
        if (eventType === 'ShipmentEventList' || eventType === 'ShipmentSettleEventList') {
          console.log('   Sample orders:');
          events[eventType].slice(0, 3).forEach((e: any) => {
            console.log('   -', e.AmazonOrderId, '| Posted:', e.PostedDate?.split('T')[0]);
          });
        }
      }
    }

    // Check specifically for our orders
    console.log('');
    console.log('Searching for specific orders:');
    const searchOrders = ['304-2216059-3290743', '306-5361600-3434713'];

    for (const orderId of searchOrders) {
      let found = false;

      for (const eventType of eventTypes) {
        if (events[eventType]) {
          const foundInType = events[eventType].find((e: any) =>
            e.AmazonOrderId === orderId ||
            e.ShipmentItemList?.some((item: any) => item.OrderId === orderId)
          );

          if (foundInType) {
            console.log(`✅ ${orderId} found in ${eventType}`);
            console.log('   Details:', JSON.stringify(foundInType, null, 2).substring(0, 500));
            found = true;
            break;
          }
        }
      }

      if (!found) {
        console.log(`❌ ${orderId} NOT found in any event type`);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
