import { PrismaClient } from '@prisma/client';
import SPAPIService from './src/services/spapi.service';

const prisma = new PrismaClient();
const accountId = 'cmggmot2a0005g9362659z7xx';

async function updatePendingOrderPrices() {
  console.log('\n🔄 Updating prices for Pending orders from Amazon API...\n');

  // Get all Pending orders with items that have itemPrice = 0
  const pendingOrders = await prisma.order.findMany({
    where: {
      accountId,
      orderStatus: {
        in: ['Pending', 'Unshipped']
      }
    },
    include: {
      items: true
    }
  });

  console.log(`Found ${pendingOrders.length} Pending/Unshipped orders`);

  const spapi = new SPAPIService(accountId);
  let updated = 0;
  let skipped = 0;

  for (const order of pendingOrders) {
    try {
      // Get order items from Amazon API
      const response = await spapi.getOrderItems(order.amazonOrderId);
      const amazonItems = response.OrderItems || [];

      for (const amazonItem of amazonItems) {
        // Find corresponding item in database
        const dbItem = order.items.find(i => i.sku === amazonItem.SellerSKU);

        if (dbItem) {
          const newPrice = parseFloat(amazonItem.ItemPrice?.Amount || '0');
          const newTax = parseFloat(amazonItem.ItemTax?.Amount || '0');

          // Update if price changed
          if (newPrice !== dbItem.itemPrice || newTax !== dbItem.itemTax) {
            await prisma.orderItem.update({
              where: { id: dbItem.id },
              data: {
                itemPrice: newPrice,
                itemTax: newTax,
                shippingPrice: parseFloat(amazonItem.ShippingPrice?.Amount || '0'),
                shippingTax: parseFloat(amazonItem.ShippingTax?.Amount || '0'),
                promotionDiscount: parseFloat(amazonItem.PromotionDiscount?.Amount || '0'),
              }
            });

            console.log(`  ✓ ${order.amazonOrderId} - ${dbItem.sku}: €${dbItem.itemPrice} → €${newPrice}`);
            updated++;
          } else {
            skipped++;
          }
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.error(`  ❌ Error updating ${order.amazonOrderId}:`, error.message);
    }
  }

  console.log(`\n✅ Updated ${updated} order items`);
  console.log(`⏭️  Skipped ${skipped} items (no change)`);

  await prisma.$disconnect();
}

updatePendingOrderPrices().catch(console.error);
