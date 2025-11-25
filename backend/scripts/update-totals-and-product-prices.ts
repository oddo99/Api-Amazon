import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Update order totalAmount and product prices after fixing net prices
 *
 * This script:
 * 1. Updates Product.price to match the net itemPrice from order items
 * 2. Updates Order.totalAmount to be the sum of net item prices
 */
async function updateTotalsAndProductPrices() {
  try {
    console.log('🔧 Updating order totals and product prices...\n');

    // Get all orders with their items
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log(`📦 Found ${orders.length} orders to process\n`);

    let ordersUpdated = 0;
    let productsUpdated = 0;
    const updatedProductIds = new Set<string>();

    for (const order of orders) {
      // Calculate new totalAmount from item net prices (itemPrice is already net after previous fix)
      const newTotalAmount = order.items.reduce((sum, item) => {
        return sum + (item.itemPrice * item.quantity) + item.shippingPrice - item.promotionDiscount;
      }, 0);

      // Update order totalAmount if different
      if (Math.abs(newTotalAmount - order.totalAmount) > 0.01 && newTotalAmount > 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: { totalAmount: newTotalAmount },
        });
        console.log(`✅ Updated order ${order.amazonOrderId}: ${order.totalAmount.toFixed(2)} → ${newTotalAmount.toFixed(2)}`);
        ordersUpdated++;
      }

      // Update product prices to match net item prices
      for (const item of order.items) {
        if (!updatedProductIds.has(item.productId)) {
          const currentProductPrice = item.product.price || 0;
          const netItemPrice = item.itemPrice;

          // Update product price if it's significantly different
          if (Math.abs(currentProductPrice - netItemPrice) > 0.01 && netItemPrice > 0) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { price: netItemPrice },
            });
            console.log(`  📦 Updated product ${item.sku}: ${currentProductPrice.toFixed(2)} → ${netItemPrice.toFixed(2)}`);
            updatedProductIds.add(item.productId);
            productsUpdated++;
          }
        }
      }

      if ((ordersUpdated + 1) % 100 === 0) {
        console.log(`\n📊 Progress: ${ordersUpdated + 1}/${orders.length} orders processed\n`);
      }
    }

    console.log('\n✅ Done!');
    console.log(`\n📊 Summary:`);
    console.log(`   Orders updated: ${ordersUpdated}`);
    console.log(`   Products updated: ${productsUpdated}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateTotalsAndProductPrices();
