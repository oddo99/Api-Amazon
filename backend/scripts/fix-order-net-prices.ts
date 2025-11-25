import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix order item prices to store net prices (VAT-exclusive)
 *
 * Background:
 * - Amazon returns ItemPrice with VAT included for B2C orders in EU
 * - We want to store net prices (VAT-exclusive) in our database
 * - This script recalculates net prices for all existing orders
 *
 * Logic:
 * - All existing orders are assumed to be B2C (isBusinessOrder = false)
 * - For B2C orders: Net Price = Gross Price - Tax
 * - For B2B orders: Net Price = Gross Price (already net, reverse charge)
 */
async function fixOrderNetPrices() {
  try {
    console.log('🔧 Starting to fix order net prices...\n');

    // Get all orders with their items
    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    console.log(`📦 Found ${orders.length} orders to process\n`);

    let ordersUpdated = 0;
    let itemsUpdated = 0;

    for (const order of orders) {
      const isBusinessOrder = order.isBusinessOrder || false;

      // Process each order item
      for (const item of order.items) {
        // Current values (which are VAT-inclusive for B2C orders)
        const currentItemPrice = item.itemPrice;
        const currentShippingPrice = item.shippingPrice;
        const itemTax = item.itemTax;
        const shippingTax = item.shippingTax;

        // Calculate net prices
        let newItemPrice: number;
        let newShippingPrice: number;

        if (isBusinessOrder) {
          // B2B: Prices are already net (reverse charge)
          newItemPrice = currentItemPrice;
          newShippingPrice = currentShippingPrice;
        } else {
          // B2C: Subtract tax to get net price
          // Handle edge case where tax might be 0 or price already adjusted
          if (itemTax > 0 && currentItemPrice > itemTax) {
            newItemPrice = currentItemPrice - itemTax;
          } else {
            newItemPrice = currentItemPrice;
          }

          if (shippingTax > 0 && currentShippingPrice > shippingTax) {
            newShippingPrice = currentShippingPrice - shippingTax;
          } else {
            newShippingPrice = currentShippingPrice;
          }
        }

        // Only update if prices changed
        if (newItemPrice !== currentItemPrice || newShippingPrice !== currentShippingPrice) {
          await prisma.orderItem.update({
            where: { id: item.id },
            data: {
              itemPrice: newItemPrice,
              shippingPrice: newShippingPrice,
            },
          });

          console.log(`✅ Updated item ${item.sku}:`);
          console.log(`   Item Price: ${currentItemPrice.toFixed(2)} → ${newItemPrice.toFixed(2)} (Tax: ${itemTax.toFixed(2)})`);
          if (newShippingPrice !== currentShippingPrice) {
            console.log(`   Shipping: ${currentShippingPrice.toFixed(2)} → ${newShippingPrice.toFixed(2)} (Tax: ${shippingTax.toFixed(2)})`);
          }

          itemsUpdated++;
        }

        // Update product price to net price (use first item's price as reference)
        if (order.items.length > 0 && !isBusinessOrder) {
          const firstItem = order.items[0];
          const currentProductPrice = firstItem.product?.price || 0;
          const netItemPrice = firstItem.itemPrice - firstItem.itemTax;

          if (currentProductPrice !== netItemPrice && firstItem.product) {
            await prisma.product.update({
              where: { id: firstItem.product.id },
              data: { price: netItemPrice > 0 ? netItemPrice : firstItem.itemPrice },
            });
          }
        }
      }

      // Recalculate order totalAmount as sum of net prices
      const newTotalAmount = order.items.reduce((sum, item) => {
        const netPrice = isBusinessOrder ? item.itemPrice : (item.itemPrice - item.itemTax);
        return sum + (netPrice * item.quantity) + (item.shippingPrice - item.shippingTax) - item.promotionDiscount;
      }, 0);

      if (newTotalAmount !== order.totalAmount && newTotalAmount > 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: { totalAmount: newTotalAmount },
        });
      }

      ordersUpdated++;
      if (ordersUpdated % 100 === 0) {
        console.log(`\n📊 Progress: ${ordersUpdated}/${orders.length} orders processed\n`);
      }
    }

    console.log('\n✅ Done!');
    console.log(`\n📊 Summary:`);
    console.log(`   Orders processed: ${ordersUpdated}`);
    console.log(`   Items updated: ${itemsUpdated}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixOrderNetPrices();
