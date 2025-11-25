import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecificOrders() {
  try {
    console.log('🔍 Checking specific orders in database...');
    
    const targetOrders = ['405-0717521-6478704', '402-9069222-7013140'];
    
    for (const orderId of targetOrders) {
      console.log(`\n📦 Checking order: ${orderId}`);
      
      // Check if order exists in database
      const order = await prisma.order.findFirst({
        where: {
          amazonOrderId: orderId
        },
        include: {
          orderItems: true
        }
      });
      
      if (order) {
        console.log(`✅ Order found in database:`);
        console.log(`   - ID: ${order.id}`);
        console.log(`   - Amazon Order ID: ${order.amazonOrderId}`);
        console.log(`   - Status: ${order.orderStatus}`);
        console.log(`   - Purchase Date: ${order.purchaseDate}`);
        console.log(`   - Total: ${order.orderTotal} ${order.currencyCode}`);
        console.log(`   - Marketplace: ${order.marketplaceId}`);
        console.log(`   - Items: ${order.orderItems.length}`);
      } else {
        console.log(`❌ Order NOT found in database`);
      }
      
      // Check financial events for this order
      console.log(`💰 Checking financial events for order: ${orderId}`);
      const financialEvents = await prisma.financialEvent.findMany({
        where: {
          amazonOrderId: orderId
        },
        orderBy: {
          postedDate: 'desc'
        }
      });
      
      if (financialEvents.length > 0) {
        console.log(`✅ Found ${financialEvents.length} financial events:`);
        let totalRevenue = 0;
        let totalFees = 0;
        
        financialEvents.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.eventType} - ${event.amount} ${event.currencyCode} (${event.postedDate?.toISOString().split('T')[0]})`);
          if (event.eventType === 'OrderRevenue') {
            totalRevenue += parseFloat(event.amount.toString());
          } else if (event.eventType === 'Fee') {
            totalFees += parseFloat(event.amount.toString());
          }
        });
        
        console.log(`   📊 Summary: Revenue: ${totalRevenue}, Fees: ${totalFees}, Net: ${totalRevenue + totalFees}`);
      } else {
        console.log(`❌ No financial events found for this order`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificOrders();