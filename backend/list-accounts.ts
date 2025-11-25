import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAccounts() {
  try {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        name: true,
        sellerId: true,
        region: true,
        marketplaceId: true,
      }
    });
    
    console.log('Account nel database:');
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(`\n${i + 1}. ${account.name || account.sellerId}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Seller ID: ${account.sellerId}`);
      console.log(`   Region: ${account.region}`);
      console.log(`   Marketplace: ${account.marketplaceId}`);
    }
    
    console.log(`\nTotale: ${accounts.length} account`);
  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAccounts();
