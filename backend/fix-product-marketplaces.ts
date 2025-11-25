import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMarketplaceIds() {
  try {
    console.log('🔧 Updating products with marketplaceId from orders...\n');

    // Get all products without marketplaceId
    const products = await prisma.product.findMany({
      where: {
        marketplaceId: null,
      },
      include: {
        orderItems: {
          include: {
            order: true,
          },
          take: 1, // Just need one order to get marketplace
        },
      },
    });

    console.log(`📦 Found ${products.length} products without marketplaceId\n`);

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      if (product.orderItems.length > 0 && product.orderItems[0].order) {
        const marketplaceId = product.orderItems[0].order.marketplaceId;

        if (marketplaceId) {
          await prisma.product.update({
            where: { id: product.id },
            data: { marketplaceId },
          });

          console.log(`✅ Updated ${product.sku}: ${marketplaceId}`);
          updated++;
        } else {
          console.log(`⚠️  Skipped ${product.sku}: order has no marketplaceId`);
          skipped++;
        }
      } else {
        console.log(`⚠️  Skipped ${product.sku}: no orders found`);
        skipped++;
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updated} products`);
    console.log(`   Skipped: ${skipped} products`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMarketplaceIds();
