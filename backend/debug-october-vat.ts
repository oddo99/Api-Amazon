
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeOctoberVAT(accountId: string) {
    // October 2025 (based on previous logs showing 2025 data)
    const startDate = new Date('2025-10-01T00:00:00Z');
    const endDate = new Date('2025-10-31T23:59:59Z');

    console.log(`📊 Analyzing VAT for October 2025 (${startDate.toISOString()} - ${endDate.toISOString()})`);
    console.log(`📅 Account: ${accountId}`);

    // 1. Get all orders in this period
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

    console.log(`\n📦 Total Orders: ${orders.length}`);

    let totalRevenue = 0;
    let totalTax = 0;
    let calculatedTax22 = 0; // Assuming 22% VAT if not specified

    // Check a sample of orders
    const sampleOrders = orders.slice(0, 5);

    for (const order of orders) {
        const orderRevenue = order.totalAmount;
        totalRevenue += orderRevenue;

        // Sum tax from items
        let orderTax = 0;
        for (const item of order.items) {
            orderTax += (item.itemTax || 0) + (item.shippingTax || 0);
        }
        totalTax += orderTax;

        // Calculate theoretical tax (Revenue / 1.22 * 0.22) -> Revenue - (Revenue / 1.22)
        // This assumes revenue includes VAT
        calculatedTax22 += orderRevenue - (orderRevenue / 1.22);
    }

    console.log(`\n💰 Financial Summary (from Orders table):`);
    console.log(`   Total Revenue (Gross): €${totalRevenue.toFixed(2)}`);
    console.log(`   Total Tax (from items): €${totalTax.toFixed(2)}`);
    console.log(`   Calculated Tax (assuming 22% included): €${calculatedTax22.toFixed(2)}`);
    console.log(`   Effective Tax Rate: ${((totalTax / (totalRevenue - totalTax)) * 100).toFixed(2)}%`);

    // 2. Check Financial Events (Fees & Revenue)
    const events = await prisma.financialEvent.findMany({
        where: {
            accountId,
            postedDate: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    const revenueEvents = events.filter(e => e.eventType === 'OrderRevenue');
    const feeEvents = events.filter(e => e.eventType === 'Fee');

    const totalEventRevenue = revenueEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalEventFees = feeEvents.reduce((sum, e) => sum + e.amount, 0);

    console.log(`\n📉 Financial Events Summary:`);
    console.log(`   Total Revenue Events: €${totalEventRevenue.toFixed(2)}`);
    console.log(`   Total Fee Events: €${totalEventFees.toFixed(2)}`);

    // 3. Check specific orders with high tax discrepancy
    console.log(`\n🔍 Detailed Order Analysis (First 5):`);
    for (const order of sampleOrders) {
        let orderTax = 0;
        order.items.forEach(i => orderTax += (i.itemTax || 0) + (i.shippingTax || 0));

        console.log(`   Order ${order.amazonOrderId}:`);
        console.log(`     Revenue: €${order.totalAmount}`);
        console.log(`     Tax (DB): €${orderTax.toFixed(2)}`);
        console.log(`     Items: ${order.items.length}`);
        order.items.forEach(i => {
            console.log(`       - SKU: ${i.sku} Price: ${i.itemPrice} Tax: ${i.itemTax}`);
        });
    }

    await prisma.$disconnect();
}

const accountId = process.argv[2] || 'cmgpgl4dt01e63nj3ptbfommh';
analyzeOctoberVAT(accountId);
