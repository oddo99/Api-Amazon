import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecificOrders() {
  console.log('🚀 Starting script...');
  try {
    console.log('🔍 Checking specific orders from October 2025...');
    
    const targetOrders = ['405-0717521-6478704', '402-9069222-7013140'];
    
    for (const orderId of targetOrders) {
      console.log(`\n📦 Checking order: ${orderId}`);
      
      // Check if order exists in database
      const order = await prisma.order.findFirst({
        where: {
          amazonOrderId: orderId
        },
        include: {
          items: true
        }
      });
      
      if (order) {
        console.log(`✅ Order found in database:`);
        console.log(`   - ID: ${order.id}`);
        console.log(`   - Amazon Order ID: ${order.amazonOrderId}`);
        console.log(`   - Status: ${order.orderStatus}`);
        console.log(`   - Purchase Date: ${order.purchaseDate}`);
        console.log(`   - Total: ${order.totalAmount} ${order.currency}`);
        console.log(`   - Marketplace: ${order.marketplaceId}`);
        console.log(`   - Items: ${order.items.length}`);
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
    
    // Also check what orders we have for October 2025
    console.log(`\n📅 Checking all orders from October 2025...`);
    const octoberOrders = await prisma.order.findMany({
      where: {
        purchaseDate: {
          gte: new Date('2025-10-01'),
          lt: new Date('2025-11-01')
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      },
      take: 10
    });
    
    console.log(`Found ${octoberOrders.length} orders in October 2025:`);
    octoberOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.amazonOrderId} - ${order.orderStatus} - ${order.purchaseDate?.toISOString().split('T')[0]} - ${order.totalAmount} ${order.currency}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificOrders();