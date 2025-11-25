import { PrismaClient } from '@prisma/client';
import SPAPIService from './src/services/spapi.service';

const prisma = new PrismaClient();

async function test() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  // Get a recent Germany order to check for its financial events
  const recentGermanOrder = await prisma.order.findFirst({
    where: {
      accountId,
      marketplaceId: 'A1PA6795UKMFR9',
      purchaseDate: {
        gte: new Date('2025-02-01')
      },
      orderStatus: 'Shipped'
    },
    orderBy: {
      purchaseDate: 'desc'
    }
  });

  if (recentGermanOrder === null) {
    console.log('No recent shipped Germany order found');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📦 Testing with Germany order:');
  console.log('  Order ID:', recentGermanOrder.amazonOrderId);
  console.log('  Purchase Date:', recentGermanOrder.purchaseDate.toISOString().split('T')[0]);
  console.log('  Status:', recentGermanOrder.orderStatus);
  console.log('  Total:', recentGermanOrder.totalAmount);

  // Check if we have financial events for this order in DB
  const existingEvents = await prisma.financialEvent.findMany({
    where: {
      amazonOrderId: recentGermanOrder.amazonOrderId
    }
  });

  console.log('\n💾 Financial Events in Database:', existingEvents.length);
  if (existingEvents.length > 0) {
    console.log('  Marketplace:', existingEvents[0].marketplaceId);
    console.log('  Posted Date:', existingEvents[0].postedDate.toISOString().split('T')[0]);
  }

  // Try to fetch financial events for this specific order from Amazon API
  try {
    console.log('\n🔍 Fetching from Amazon API...');
    const spapi = new SPAPIService(accountId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for client init

    const events = await spapi.listFinancialEventsByOrderId(recentGermanOrder.amazonOrderId);

    console.log('\n💰 Financial Events from Amazon API:');
    if (events.FinancialEvents) {
      const shipments = events.FinancialEvents.ShipmentEventList || [];
      console.log('  Shipment Events:', shipments.length);

      if (shipments.length > 0) {
        const shipment = shipments[0];
        console.log('  Posted Date:', shipment.PostedDate);
        console.log('  Order ID:', shipment.AmazonOrderId);
        console.log('  Marketplace:', shipment.MarketplaceId || 'NOT PROVIDED');
        console.log('  Items:', (shipment.ShipmentItemList || []).length);

        if (shipment.ShipmentItemList && shipment.ShipmentItemList.length > 0) {
          const item = shipment.ShipmentItemList[0];
          let revenue = 0;
          for (const charge of item.ItemChargeList || []) {
            if (charge.ChargeType === 'Principal') {
              revenue += parseFloat(charge.ChargeAmount?.CurrencyAmount || '0');
            }
          }
          console.log('  First Item Revenue:', revenue);
        }
      } else {
        console.log('  ⚠️  No shipment events (Amazon hasn\'t created financial events yet)');
      }
    } else {
      console.log('  ⚠️  No financial events returned by Amazon');
    }
  } catch (error: any) {
    console.error('  ❌ Error fetching financial events:', error.message);
  }

  await prisma.$disconnect();
}

test().catch(console.error);
