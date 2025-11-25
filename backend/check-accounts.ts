import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccounts() {
  try {
    console.log('\n📊 Account Information:');
    console.log('========================\n');

    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        name: true,
        sellerId: true,
        marketplaceId: true,
      }
    });

    for (const account of accounts) {
      console.log(`Account: ${account.name}`);
      console.log(`  ID: ${account.id}`);
      console.log(`  Seller ID: ${account.sellerId}`);
      console.log(`  Marketplace ID: ${account.marketplaceId}\n`);

      // Count orders
      const orderCount = await prisma.order.count({
        where: { accountId: account.id }
      });

      // Count products
      const productCount = await prisma.product.count({
        where: { accountId: account.id }
      });

      // Count financial events
      const financeCount = await prisma.financialEvent.count({
        where: { accountId: account.id }
      });

      // Count inventory
      const inventoryCount = await prisma.inventory.count({
        where: { accountId: account.id }
      });

      console.log(`  📦 Orders: ${orderCount}`);
      console.log(`  🏷️  Products: ${productCount}`);
      console.log(`  💰 Financial Events: ${financeCount}`);
      console.log(`  📊 Inventory Items: ${inventoryCount}`);
      console.log('\n---\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccounts();
