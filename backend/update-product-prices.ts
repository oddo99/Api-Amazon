import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateProductPrices() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('\n🔧 Updating product prices from order items...\n');

  // Get products without price
  const productsWithoutPrice = await prisma.product.findMany({
    where: {
      accountId,
      price: null
    }
  });

  console.log(`Found ${productsWithoutPrice.length} products without price`);

  let updated = 0;

  for (const product of productsWithoutPrice) {
    // Find order items for this product with a price
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        sku: product.sku,
        itemPrice: { gt: 0 }
      },
      include: {
        order: true
      },
      orderBy: {
        order: {
          purchaseDate: 'desc'
        }
      }
    });

    if (orderItem && orderItem.itemPrice > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { price: orderItem.itemPrice }
      });

      console.log(`  ✓ ${product.sku}: €${orderItem.itemPrice}`);
      updated++;
    } else {
      console.log(`  ⚠ ${product.sku}: No order with price found`);
    }
  }

  console.log(`\n✅ Updated ${updated} products`);

  await prisma.$disconnect();
}

updateProductPrices().catch(console.error);
