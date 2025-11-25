import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMarketplaces() {
  try {
    // Get distinct marketplaceIds from products
    const products = await prisma.product.findMany({
      select: {
        marketplaceId: true,
      },
      distinct: ['marketplaceId'],
    });

    console.log('\n📊 Marketplace IDs in Products table:');
    console.log('====================================');
    products.forEach((p, index) => {
      console.log(`${index + 1}. ${p.marketplaceId}`);
    });
    console.log('\n');

    // Get total products per marketplace
    const counts = await prisma.product.groupBy({
      by: ['marketplaceId'],
      _count: {
        id: true,
      },
    });

    console.log('📈 Products count per marketplace:');
    console.log('==================================');
    counts.forEach((c) => {
      console.log(`${c.marketplaceId}: ${c._count.id} products`);
    });
    console.log('\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarketplaces();
