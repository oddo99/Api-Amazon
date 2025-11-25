import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugShippedOrders() {
  console.log('🔍 Debugging shipped orders with missing financial events...\n');

  try {
    // Get shipped orders from October
    const shippedOrders = await prisma.order.findMany({
      where: {
        orderStatus: 'Shipped',
        purchaseDate: {
          gte: new Date('2024-10-01'),
          lte: new Date('2024-10-31')
        }
      },
      orderBy: { purchaseDate: 'desc' },
      take: 10
    });

    console.log(`📦 Found ${shippedOrders.length} shipped orders in October`);
    
    for (const order of shippedOrders) {
      console.log(`\n--- Order: ${order.amazonOrderId} ---`);
      console.log(`Date: ${order.purchaseDate.toISOString().split('T')[0]}`);
      console.log(`Status: ${order.orderStatus}`);
      console.log(`Total: ${order.totalAmount} ${order.currency}`);

      // Check for financial events
      const events = await prisma.financialEvent.findMany({
        where: {
          amazonOrderId: order.amazonOrderId
        },
        orderBy: { postedDate: 'asc' }
      });

      if (events.length === 0) {
        console.log('❌ NO financial events found');
        
        // Check if there are any events with similar order ID patterns
        const similarEvents = await prisma.financialEvent.findMany({
          where: {
            OR: [
              { amazonOrderId: { contains: order.amazonOrderId.split('-')[0] } },
              { amazonOrderId: { contains: order.amazonOrderId.split('-')[1] } },
              { amazonOrderId: { contains: order.amazonOrderId.split('-')[2] } }
            ]
          },
          take: 3
        });

        if (similarEvents.length > 0) {
          console.log('🔍 Found similar order IDs in financial events:');
          similarEvents.forEach(e => {
            console.log(`  - ${e.amazonOrderId} | ${e.eventType} | ${e.amount}`);
          });
        }
      } else {
        console.log(`✅ Found ${events.length} financial events:`);
        events.forEach(e => {
          console.log(`  - ${e.eventType} | ${e.amount} | ${e.postedDate.toISOString().split('T')[0]}`);
        });
      }
    }

    // Check for orphaned financial events (events without matching orders)
    console.log('\n🔍 Checking for orphaned financial events...');
    
    const orphanedEvents = await prisma.$queryRaw<Array<{
      amazonOrderId: string;
      eventCount: number;
    }>>`
      SELECT fe.amazonOrderId, COUNT(*) as eventCount
      FROM FinancialEvent fe
      LEFT JOIN \`Order\` o ON fe.amazonOrderId = o.amazonOrderId
      WHERE o.amazonOrderId IS NULL
        AND fe.postedDate >= '2024-10-01'
        AND fe.postedDate <= '2024-10-31'
      GROUP BY fe.amazonOrderId
      ORDER BY eventCount DESC
      LIMIT 10
    `;

    if (orphanedEvents.length > 0) {
      console.log(`\n🚨 Found ${orphanedEvents.length} order IDs with financial events but no matching orders:`);
      orphanedEvents.forEach(e => {
        console.log(`  - ${e.amazonOrderId} (${e.eventCount} events)`);
      });

      // Show details for first orphaned event
      const firstOrphan = orphanedEvents[0];
      const orphanDetails = await prisma.financialEvent.findMany({
        where: { amazonOrderId: firstOrphan.amazonOrderId },
        orderBy: { postedDate: 'asc' }
      });

      console.log(`\n📋 Details for ${firstOrphan.amazonOrderId}:`);
      orphanDetails.forEach(e => {
        console.log(`  - ${e.eventType} | ${e.amount} | ${e.postedDate.toISOString().split('T')[0]} | ${e.description || 'N/A'}`);
      });
    } else {
      console.log('✅ No orphaned financial events found');
    }

    // Check for recent financial events that might belong to shipped orders
    console.log('\n🔍 Checking recent financial events for OrderRevenue...');
    
    const recentOrderRevenue = await prisma.financialEvent.findMany({
      where: {
        eventType: 'OrderRevenue',
        postedDate: {
          gte: new Date('2024-10-01'),
          lte: new Date('2024-10-31')
        }
      },
      orderBy: { postedDate: 'desc' },
      take: 10
    });

    console.log(`\n💰 Found ${recentOrderRevenue.length} OrderRevenue events in October:`);
    for (const event of recentOrderRevenue) {
      console.log(`  - ${event.amazonOrderId} | ${event.amount} | ${event.postedDate.toISOString().split('T')[0]}`);
      
      // Check if this order exists
      const matchingOrder = event.amazonOrderId ? await prisma.order.findUnique({
        where: { amazonOrderId: event.amazonOrderId }
      }) : null;
      
      if (matchingOrder) {
        console.log(`    ✅ Order exists: ${matchingOrder.orderStatus} | ${matchingOrder.totalAmount}`);
      } else {
        console.log(`    ❌ No matching order found`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugShippedOrders();