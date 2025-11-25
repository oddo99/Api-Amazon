// Script to clear financial events before re-syncing with 730 days
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all financial events...');

  const deleted = await prisma.financialEvent.deleteMany({});

  console.log(`✅ Deleted ${deleted.count} financial events`);
  console.log('💡 Now trigger a sync to re-import 730 days of financial data');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
