
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugProfitLogic(accountId: string) {
    const startDate = new Date('2025-10-01T00:00:00Z');
    const endDate = new Date('2025-10-31T23:59:59Z');

    console.log(`📊 Debugging Profit Logic for Oct 2025`);

    // 1. Fetch Orders
    const orders = await prisma.order.findMany({
        where: {
            accountId,
            purchaseDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            items: true,
        },
    });

    let totalSales = 0;
    let totalVAT = 0;
    let totalUnits = 0;

    const vatByOrder: { id: string, vat: number, sales: number }[] = [];

    for (const order of orders) {
        // Logic from finance.service.ts
        // dailyStats[dateKey].sales += event.amount (This comes from FinancialEvents usually)
        // But let's check what comes from Orders

        // In the service, 'sales' comes from FinancialEvents (OrderRevenue).
        // 'vat' comes from Order Items.

        let orderVat = 0;
        for (const item of order.items) {
            totalUnits += item.quantity;
            orderVat += (item.itemTax || 0) + (item.shippingTax || 0);
        }

        totalVAT += orderVat;
        vatByOrder.push({ id: order.amazonOrderId, vat: orderVat, sales: order.totalAmount });
    }

    // 2. Fetch Financial Events (for Sales comparison)
    const events = await prisma.financialEvent.findMany({
        where: {
            accountId,
            postedDate: {
                gte: startDate,
                lte: endDate,
            },
            eventType: 'OrderRevenue'
        }
    });

    const eventSales = events.reduce((sum, e) => sum + e.amount, 0);

    console.log(`\n📈 Results:`);
    console.log(`   Orders Found: ${orders.length}`);
    console.log(`   Total Units: ${totalUnits} (User UI says 671)`);
    console.log(`   Total VAT (from Items): €${totalVAT.toFixed(2)} (User UI says 2697.25)`);
    console.log(`   Total Sales (from Events): €${eventSales.toFixed(2)} (User UI says 3521.39)`);

    // Sort by VAT descending
    vatByOrder.sort((a, b) => b.vat - a.vat);

    console.log(`\n🔝 Top 10 Orders by VAT:`);
    vatByOrder.slice(0, 10).forEach(o => {
        console.log(`   Order ${o.id}: VAT €${o.vat.toFixed(2)} | Sales €${o.sales.toFixed(2)} | Rate: ${((o.vat / o.sales) * 100).toFixed(1)}%`);
    });

}

const accountId = process.argv[2] || 'cmgpgl4dt01e63nj3ptbfommh';
debugProfitLogic(accountId);
