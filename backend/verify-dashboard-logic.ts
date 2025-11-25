
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDashboardLogic(accountId: string) {
    const startDate = new Date('2025-10-01T00:00:00Z');
    const endDate = new Date('2025-10-31T23:59:59Z');

    console.log(`📊 Verifying Dashboard Logic for Oct 2025`);
    console.log(`📅 Account: ${accountId}`);
    console.log(`----------------------------------------`);

    // 1. Fetch Orders (Revenue, VAT, Units, COGS)
    const orders = await prisma.order.findMany({
        where: {
            accountId,
            purchaseDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            items: {
                include: {
                    product: true
                }
            },
        },
    });

    let revenueFromOrders = 0; // Just for reference, usually dashboard uses FinancialEvents for Revenue
    let vat = 0;
    let cogs = 0;
    let units = 0;
    let promo = 0;
    let shippingCosts = 0;

    for (const order of orders) {
        // revenueFromOrders += order.totalAmount; // This might be unreliable if not updated
        for (const item of order.items) {
            units += item.quantity;
            promo += item.promotionDiscount || 0;
            shippingCosts += item.shippingPrice || 0;
            vat += (item.itemTax || 0) + (item.shippingTax || 0);
            cogs += (item.product.cost || 0) * item.quantity;
        }
    }

    // 2. Fetch Financial Events (Revenue, Fees, Refunds)
    // Note: Dashboard groups by postedDate, but for total check we use the same range
    const events = await prisma.financialEvent.findMany({
        where: {
            accountId,
            postedDate: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    let revenue = 0;
    let fees = 0;
    let refunds = 0;
    let ads = 0; // Ads are usually separate, but let's check if we have AdMetrics

    for (const event of events) {
        if (event.eventType === 'OrderRevenue') {
            revenue += event.amount;
        } else if (event.eventType === 'Fee' || event.eventType === 'ServiceFee') {
            fees += Math.abs(event.amount);
        } else if (event.eventType === 'Refund') {
            refunds += Math.abs(event.amount);
        }
    }

    // 3. Fetch Ads
    const adMetrics = await prisma.adMetrics.findMany({
        where: {
            accountId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    for (const metric of adMetrics) {
        ads += metric.spend;
    }

    // 4. Calculate Net Profit
    // Formula: Revenue - Fees - Refunds - COGS - Ads - VAT
    const netProfit = revenue - fees - refunds - cogs - ads - vat;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    console.log(`💰 Calculated Values:`);
    console.log(`   Revenue:       €${revenue.toFixed(2)}`);
    console.log(`   Fees:          €${fees.toFixed(2)}`);
    console.log(`   VAT:           €${vat.toFixed(2)}`);
    console.log(`   Refunds:       €${refunds.toFixed(2)}`);
    console.log(`   COGS:          €${cogs.toFixed(2)}`);
    console.log(`   Ads:           €${ads.toFixed(2)}`);
    console.log(`   ----------------------------`);
    console.log(`   NET PROFIT:    €${netProfit.toFixed(2)}`);
    console.log(`   Margin:        ${margin.toFixed(2)}%`);

    console.log(`\n📦 Operational Metrics:`);
    console.log(`   Orders:        ${orders.length}`);
    console.log(`   Units:         ${units}`);
    console.log(`   Shipping Cost: €${shippingCosts.toFixed(2)}`);

}

const accountId = process.argv[2] || 'cmggmot2a0005g9362659z7xx'; // Default to Grifos
verifyDashboardLogic(accountId);
