import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix product prices to use net prices (VAT-exclusive)
 *
 * For each product, we find the most recent order item and use its net itemPrice
 */
async function fixProductPrices() {
  try {
    console.log('🔧 Fixing product prices...\n');

    // Get all products
    const products = await prisma.product.findMany({
      include: {
        orderItems: {
          where: {
            itemPrice: { gt: 0 } // Only consider items with valid prices
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1, // Get the most recent order item
          include: {
            order: true
          }
        }
      }
    });

    console.log(`📦 Found ${products.length} products to check\n`);

    let updated = 0;

    for (const product of products) {
      if (product.orderItems.length === 0) {
        console.log(`⚠️  Product ${product.sku}: No order items found, keeping price ${product.price}`);
        continue;
      }

      const latestOrderItem = product.orderItems[0];
      const netPrice = latestOrderItem.itemPrice; // This is already net price after our fix

      // Only update if different
      if (Math.abs((product.price || 0) - netPrice) > 0.01) {
        await prisma.product.update({
          where: { id: product.id },
          data: { price: netPrice }
        });

        console.log(`✅ Updated ${product.sku}: ${(product.price || 0).toFixed(2)} → ${netPrice.toFixed(2)}`);
        updated++;
      }
    }

    console.log(`\n✅ Done! Updated ${updated} products`);
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixProductPrices();
