import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const account = await prisma.account.findFirst();
    if (!account) {
      console.log('No account found');
      return;
    }

    // Calculate for last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log('Date range:');
    console.log('  Start:', startDate.toISOString().split('T')[0]);
    console.log('  End:', endDate.toISOString().split('T')[0]);
    console.log('');

    // Get orders by purchaseDate (like the dashboard should do)
    const orders = await prisma.order.findMany({
      where: {
        accountId: account.id,
        purchaseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    console.log(`Found ${orders.length} orders`);
    console.log('');

    let totalRevenue = 0;
    orders.forEach(order => {
      console.log(`${order.amazonOrderId} | ${order.purchaseDate.toISOString().split('T')[0]} | ${order.totalAmount.toFixed(2)} EUR | ${order.orderStatus}`);
      totalRevenue += order.totalAmount;
    });

    console.log('');
    console.log('='.repeat(60));
    console.log(`TOTAL REVENUE: ${totalRevenue.toFixed(2)} EUR`);
    console.log('='.repeat(60));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
