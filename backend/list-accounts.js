// List all accounts in the database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log('Available accounts:');
  accounts.forEach(account => {
    console.log(`ID: ${account.id}`);
    console.log(`Seller ID: ${account.sellerId}`);
    console.log(`Marketplace: ${account.marketplaceId}`);
    console.log(`Region: ${account.region}`);
    console.log(`Solution Provider: ${account.isSolutionProvider}`);
    console.log(`Created: ${account.createdAt.toISOString().split('T')[0]}`);
    console.log('---');
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });