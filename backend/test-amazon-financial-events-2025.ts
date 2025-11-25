import { PrismaClient } from '@prisma/client';
import SPAPIService from './src/services/spapi.service';

const prisma = new PrismaClient();

async function testAmazonFinancialEvents() {
  console.log('🚀 Starting script...');
  try {
    console.log('🚀 Testing Amazon Financial Events API for October 2025...');
    
    // Target orders to check
    const targetOrders = ['405-0717521-6478704', '402-9069222-7013140'];
    
    // Get account for API access
    const account = await prisma.account.findFirst();
    if (!account) {
      console.log('❌ No account found');
      return;
    }
    
    // Initialize SPAPI service
    const spapi = new SPAPIService(account.id);
    
    // Date range for October 2025 (up to current date)
    const startDate = new Date('2025-10-01T00:00:00.000Z');
    const currentDate = new Date();
    // Set end date to current time to avoid "date in future" error
    const endDate = new Date(currentDate.getTime() - 2 * 60 * 1000); // 2 minutes ago to be safe
    
    console.log(`📅 Checking financial events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`📅 Current date: ${currentDate.toISOString()}`);
    
    // Get financial events for October 2025 (up to now)
    console.log('\n📊 Fetching financial events from Amazon...');
    const response = await spapi.listFinancialEvents({
      PostedAfter: startDate.toISOString(),
      PostedBefore: endDate.toISOString(),
      MaxResultsPerPage: 100,
    });
    
    const events = response.FinancialEvents || {};
    console.log(`Found financial events response`);
    
    // Check shipment events
    if (events.ShipmentEventList && events.ShipmentEventList.length > 0) {
      console.log(`\n🚚 Shipment events: ${events.ShipmentEventList.length}`);
      
      for (const shipment of events.ShipmentEventList) {
        if (targetOrders.includes(shipment.AmazonOrderId)) {
          console.log(`\n⭐ TARGET ORDER FOUND: ${shipment.AmazonOrderId}`);
          console.log(`   Posted Date: ${shipment.PostedDate}`);
          console.log(`   Marketplace: ${shipment.MarketplaceId}`);
          
          if (shipment.ShipmentItemList) {
            for (const item of shipment.ShipmentItemList) {
              console.log(`   📦 Item: ${item.SellerSKU}`);
              console.log(`      Quantity: ${item.QuantityShipped}`);
              
              if (item.ItemChargeList) {
                console.log(`      💰 Charges:`);
                for (const charge of item.ItemChargeList) {
                  console.log(`         ${charge.ChargeType}: ${charge.ChargeAmount?.CurrencyAmount} ${charge.ChargeAmount?.CurrencyCode}`);
                }
              }
              
              if (item.ItemFeeList) {
                console.log(`      💸 Fees:`);
                for (const fee of item.ItemFeeList) {
                  console.log(`         ${fee.FeeType}: ${fee.FeeAmount?.CurrencyAmount} ${fee.FeeAmount?.CurrencyCode}`);
                }
              }
            }
          }
        }
      }
    } else {
      console.log('\n❌ No shipment events found');
    }
    
    // Check refund events
    if (events.RefundEventList && events.RefundEventList.length > 0) {
      console.log(`\n🔄 Refund events: ${events.RefundEventList.length}`);
      
      for (const refund of events.RefundEventList) {
        if (targetOrders.includes(refund.AmazonOrderId)) {
          console.log(`\n⭐ TARGET ORDER REFUND: ${refund.AmazonOrderId}`);
          console.log(`   Posted Date: ${refund.PostedDate}`);
        }
      }
    }
    
    // Check other event types
    if (events.ServiceFeeEventList && events.ServiceFeeEventList.length > 0) {
      console.log(`\n🔧 Service fee events: ${events.ServiceFeeEventList.length}`);
    }
    
    if (events.AdjustmentEventList && events.AdjustmentEventList.length > 0) {
      console.log(`\n⚖️ Adjustment events: ${events.AdjustmentEventList.length}`);
    }
    
    // Also check by specific order ID
    console.log('\n🔍 Checking specific orders by ID...');
    for (const orderId of targetOrders) {
      try {
        console.log(`\nChecking order: ${orderId}`);
        const orderEvents = await spapi.listFinancialEventsByOrderId(orderId);
        
        if (orderEvents.FinancialEvents) {
          const orderShipments = orderEvents.FinancialEvents.ShipmentEventList || [];
          console.log(`   Found ${orderShipments.length} shipment events for this order`);
          
          for (const shipment of orderShipments) {
            console.log(`   📦 Shipment Posted: ${shipment.PostedDate}`);
            console.log(`   📦 Marketplace: ${shipment.MarketplaceId}`);
            
            if (shipment.ShipmentItemList) {
              for (const item of shipment.ShipmentItemList) {
                console.log(`      Item: ${item.SellerSKU} (Qty: ${item.QuantityShipped})`);
                
                let totalRevenue = 0;
                let totalFees = 0;
                
                if (item.ItemChargeList) {
                  for (const charge of item.ItemChargeList) {
                    const amount = parseFloat(charge.ChargeAmount?.CurrencyAmount || '0');
                    totalRevenue += amount;
                    console.log(`         Revenue ${charge.ChargeType}: ${amount} ${charge.ChargeAmount?.CurrencyCode}`);
                  }
                }
                
                if (item.ItemFeeList) {
                  for (const fee of item.ItemFeeList) {
                    const amount = parseFloat(fee.FeeAmount?.CurrencyAmount || '0');
                    totalFees += Math.abs(amount); // Fees are usually negative
                    console.log(`         Fee ${fee.FeeType}: ${amount} ${fee.FeeAmount?.CurrencyCode}`);
                  }
                }
                
                console.log(`      💰 Total Revenue: ${totalRevenue}`);
                console.log(`      💸 Total Fees: ${totalFees}`);
                console.log(`      💵 Net: ${totalRevenue - totalFees}`);
              }
            }
          }
        } else {
          console.log(`   ❌ No financial events found for order ${orderId}`);
        }
      } catch (error) {
        console.error(`   ❌ Error checking order ${orderId}:`, error.message);
      }
    }
    
    // Also check what we have in our database for comparison
    console.log('\n🗄️ Checking database for comparison...');
    
    for (const orderId of targetOrders) {
      const order = await prisma.order.findFirst({
        where: { amazonOrderId: orderId },
        include: {
          items: true
        }
      });
      
      if (order) {
        console.log(`\n📋 Database Order: ${orderId}`);
        console.log(`   Status: ${order.orderStatus}`);
        console.log(`   Date: ${order.purchaseDate}`);
        console.log(`   Total: ${order.totalAmount} ${order.currency}`);
        
        // Get financial events separately
        const financialEvents = await prisma.financialEvent.findMany({
          where: { amazonOrderId: orderId },
          orderBy: { postedDate: 'asc' }
        });
        
        console.log(`   Financial Events: ${financialEvents.length}`);
        
        for (const event of financialEvents) {
          console.log(`     - ${event.eventType}: ${event.amount} ${event.currency} (${event.postedDate.toISOString().split('T')[0]})`);
        }
      } else {
        console.log(`\n❌ Order ${orderId} not found in database`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Amazon Financial Events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAmazonFinancialEvents().catch(console.error);