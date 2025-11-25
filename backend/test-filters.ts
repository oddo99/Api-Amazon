
import { PrismaClient } from '@prisma/client';
import { FinanceService } from './src/services/finance.service';

const prisma = new PrismaClient();

async function testFilters(accountId: string) {
    console.log(`🧪 Testing Dashboard Filters Logic`);
    console.log(`📅 Account: ${accountId}`);

    const financeService = new FinanceService(accountId, '');

    // Date Range: October 2025
    const startDate = new Date('2025-10-01T00:00:00Z');
    const endDate = new Date('2025-10-31T23:59:59Z');

    console.log(`\n📅 Period: October 2025`);

    // 1. All Marketplaces
    const allStats = await financeService.calculateProfit(accountId, {
        startDate,
        endDate,
    });
    console.log(`🌍 All Marketplaces:`);
    console.log(`   Revenue: €${allStats.revenue.toFixed(2)}`);
    console.log(`   Orders:  ${allStats.orderCount}`);
    console.log(`   Profit:  €${allStats.netProfit.toFixed(2)}`);

    // 2. Italy (APJ6JRA9NG5V4)
    const itStats = await financeService.calculateProfit(accountId, {
        startDate,
        endDate,
        marketplaceIds: ['APJ6JRA9NG5V4'],
    });
    console.log(`🇮🇹 Italy Only:`);
    console.log(`   Revenue: €${itStats.revenue.toFixed(2)}`);
    console.log(`   Orders:  ${itStats.orderCount}`);
    console.log(`   Profit:  €${itStats.netProfit.toFixed(2)}`);

    // 3. Germany (A1PA6795UKMFR9)
    const deStats = await financeService.calculateProfit(accountId, {
        startDate,
        endDate,
        marketplaceIds: ['A1PA6795UKMFR9'],
    });
    console.log(`🇩🇪 Germany Only:`);
    console.log(`   Revenue: €${deStats.revenue.toFixed(2)}`);
    console.log(`   Orders:  ${deStats.orderCount}`);
    console.log(`   Profit:  €${deStats.netProfit.toFixed(2)}`);

    // 4. France (A13V1IB3VIYZZH)
    const frStats = await financeService.calculateProfit(accountId, {
        startDate,
        endDate,
        marketplaceIds: ['A13V1IB3VIYZZH'],
    });
    console.log(`🇫🇷 France Only:`);
    console.log(`   Revenue: €${frStats.revenue.toFixed(2)}`);
    console.log(`   Orders:  ${frStats.orderCount}`);

    // 5. Spain (A1RKKUPIHCS9HS)
    const esStats = await financeService.calculateProfit(accountId, {
        startDate,
        endDate,
        marketplaceIds: ['A1RKKUPIHCS9HS'],
    });
    console.log(`🇪🇸 Spain Only:`);
    console.log(`   Revenue: €${esStats.revenue.toFixed(2)}`);
    console.log(`   Orders:  ${esStats.orderCount}`);

    // Sum check
    const sumRevenue = itStats.revenue + deStats.revenue + frStats.revenue + esStats.revenue;
    const sumOrders = itStats.orderCount + deStats.orderCount + frStats.orderCount + esStats.orderCount;

    console.log(`\n∑ Sum of IT+DE+FR+ES:`);
    console.log(`   Revenue: €${sumRevenue.toFixed(2)} (Diff: ${(allStats.revenue - sumRevenue).toFixed(2)})`);
    console.log(`   Orders:  ${sumOrders} (Diff: ${allStats.orderCount - sumOrders})`);

    if (Math.abs(allStats.revenue - sumRevenue) < 1) {
        console.log(`✅ Revenue Sum Matches! Filters are working correctly.`);
    } else {
        console.log(`⚠️  Revenue Sum Mismatch! (Maybe other marketplaces or data issue)`);
    }
}

const accountId = process.argv[2];
if (!accountId) {
    console.error('Usage: npx ts-node test-filters.ts <accountId>');
    process.exit(1);
}

testFilters(accountId);
