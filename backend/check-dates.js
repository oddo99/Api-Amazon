// Check dates of financial events in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.financialEvent.findMany({
    select: {
      postedDate: true,
      eventType: true,
      amount: true,
    },
    orderBy: {
      postedDate: 'desc',
    },
    take: 10,
  });

  console.log('Latest 10 financial events:');
  events.forEach((event) => {
    console.log(`  ${event.postedDate.toISOString().split('T')[0]} - ${event.eventType} - €${event.amount}`);
  });

  const oldest = await prisma.financialEvent.findFirst({
    orderBy: {
      postedDate: 'asc',
    },
  });

  console.log(`\nOldest financial event: ${oldest?.postedDate.toISOString().split('T')[0]}`);

  const newest = await prisma.financialEvent.findFirst({
    orderBy: {
      postedDate: 'desc',
    },
  });

  console.log(`Newest financial event: ${newest?.postedDate.toISOString().split('T')[0]}`);

  const count = await prisma.financialEvent.count();
  console.log(`Total financial events: ${count}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
