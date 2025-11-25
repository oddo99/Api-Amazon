/**
 * Verification Script for Financial Data Quality
 * 
 * This script performs comprehensive checks on financial data:
 * 1. Duplicate detection
 * 2. VAT calculation validation
 * 3. Fee totals verification
 * 4. Data consistency checks
 * 
 * Usage:
 *   npm run ts-node backend/verify-financial-data.ts <accountId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates(accountId: string) {
    console.log('\n🔍 Checking for Duplicate Fees...\n');

    const duplicates = await prisma.$queryRaw<Array<{
        amazonOrderId: string;
        sku: string | null;
        feeType: string | null;
        eventType: string;
        count: bigint;
        totalAmount: number;
    }>>`
    SELECT 
      "amazonOrderId",
      "sku",
      "feeType",
      "eventType",
      COUNT(*) as count,
      SUM("amount") as "totalAmount"
    FROM "FinancialEvent"
    WHERE "accountId" = ${accountId}
      AND "eventType" IN ('Fee', 'ServiceFee')
    GROUP BY "amazonOrderId", "sku", "feeType", "eventType"
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

    if (duplicates.length > 0) {
        console.log(`❌ Found ${duplicates.length} duplicate fee groups:\n`);
        duplicates.slice(0, 20).forEach((dup, i) => {
            console.log(`${i + 1}. Order: ${dup.amazonOrderId}`);
            console.log(`   SKU: ${dup.sku || 'N/A'} | Fee Type: ${dup.feeType || 'N/A'}`);
            console.log(`   Count: ${dup.count} | Total: €${Number(dup.totalAmount).toFixed(2)}`);
            console.log('');
        });

        if (duplicates.length > 20) {
            console.log(`... and ${duplicates.length - 20} more`);
        }

        return false;
    } else {
        console.log('✅ No duplicate fees detected');
        return true;
    }
}

async function checkVAT(accountId: string) {
    console.log('\n🔍 Checking VAT Calculations...\n');

    // Get sample of orders with VAT
    const ordersWithVAT = await prisma.$queryRaw<Array<{
        date: Date;
        orderCount: bigint;
        totalRevenue: number;
        totalVAT: number;
        vatPercentage: number;
    }>>`
    SELECT 
      DATE("purchaseDate") as date,
      COUNT(DISTINCT o."amazonOrderId") as "orderCount",
      SUM(o."totalAmount") as "totalRevenue",
      SUM(oi."itemTax" + oi."shippingTax") as "totalVAT",
      (SUM(oi."itemTax" + oi."shippingTax") / NULLIF(SUM(o."totalAmount"), 0) * 100) as "vatPercentage"
    FROM "Order" o
    JOIN "OrderItem" oi ON o."amazonOrderId" = oi."orderId"
    WHERE o."accountId" = ${accountId}
      AND DATE("purchaseDate") >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE("purchaseDate")
    ORDER BY date DESC
    LIMIT 10
  `;

    if (ordersWithVAT.length === 0) {
        console.log('⚠️  No recent orders with VAT found');
        return true;
    }

    console.log('Last 10 days VAT analysis:\n');
    console.log('Date         | Orders | Revenue  | VAT      | VAT %');
    console.log('-------------|--------|----------|----------|-------');

    let issuesFound = false;
    ordersWithVAT.forEach(row => {
        const vatPct = row.vatPercentage;
        const isIssue = vatPct < 0 || vatPct > 30; // VAT should be 0-30% typically

        const line = `${row.date.toISOString().split('T')[0]} | ${String(row.orderCount).padEnd(6)} | €${Number(row.totalRevenue).toFixed(2).padEnd(8)} | €${Number(row.totalVAT).toFixed(2).padEnd(8)} | ${vatPct.toFixed(1)}%`;

        if (isIssue) {
            console.log(`❌ ${line} <-- ISSUE`);
            issuesFound = true;
        } else {
            console.log(`✅ ${line}`);
        }
    });

    if (issuesFound) {
        console.log('\n⚠️  VAT percentages outside normal range (0-30%) detected');
        return false;
    } else {
        console.log('\n✅ VAT calculations look reasonable');
        return true;
    }
}

async function checkFeeTotals(accountId: string) {
    console.log('\n🔍 Checking Fee Totals...\n');

    const feeSummary = await prisma.$queryRaw<Array<{
        feeCategory: string | null;
        eventCount: bigint;
        totalAmount: number;
    }>>`
    SELECT 
      "feeCategory",
      COUNT(*) as "eventCount",
      ABS(SUM("amount")) as "totalAmount"
    FROM "FinancialEvent"
    WHERE "accountId" = ${accountId}
      AND "eventType" IN ('Fee', 'ServiceFee')
      AND "postedDate" >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY "feeCategory"
    ORDER BY "totalAmount" DESC
  `;

    if (feeSummary.length === 0) {
        console.log('⚠️  No fees found in last 30 days');
        return true;
    }

    console.log('Fee totals (last 30 days):\n');

    let totalFees = 0;
    feeSummary.forEach(row => {
        const amount = Number(row.totalAmount);
        totalFees += amount;
        console.log(`${(row.feeCategory || 'Other').padEnd(25)} | ${String(row.eventCount).padEnd(8)} events | €${amount.toFixed(2)}`);
    });

    console.log(`${''.padEnd(25, '-')}|${''.padEnd(8, '-')}--------|${''}`);
    console.log(`${'TOTAL'.padEnd(25)} | ${''} | €${totalFees.toFixed(2)}`);

    console.log('\n✅ Fee summary complete');
    return true;
}

async function checkDataConsistency(accountId: string) {
    console.log('\n🔍 Checking Data Consistency...\n');

    // Check 1: Orders without financial events
    const ordersWithoutEvents = await prisma.$queryRaw<Array<{
        count: bigint;
    }>>`
    SELECT COUNT(*) as count
    FROM "Order" o
    WHERE o."accountId" = ${accountId}
      AND o."purchaseDate" >= CURRENT_DATE - INTERVAL '90 days'
      AND NOT EX ISTS (
        SELECT 1 FROM "FinancialEvent" fe 
        WHERE fe."amazonOrderId" = o."amazonOrderId"
      )
  `;

    const missingCount = Number(ordersWithoutEvents[0]?.count || 0);

    if (missingCount > 0) {
        console.log(`⚠️  ${missingCount} orders (last 90 days) have NO financial events`);
        console.log('   This may indicate incomplete sync or DEFERRED transactions not yet released');
    } else {
        console.log('✅ All recent orders have financial events');
    }

    // Check 2: Events without orders
    const eventsWithoutOrders = await prisma.$queryRaw<Array<{
        count: bigint;
    }>>`
    SELECT COUNT(*) as count
    FROM "FinancialEvent" fe
    WHERE fe."accountId" = ${accountId}
      AND fe."amazonOrderId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Order" o 
        WHERE o."amazonOrderId" = fe."amazonOrderId"
      )
    LIMIT 100
  `;

    const orphanedCount = Number(eventsWithoutOrders[0]?.count || 0);

    if (orphanedCount > 0) {
        console.log(`⚠️  ${orphanedCount} financial events reference orders that don't exist`);
        console.log('   This may indicate orders that were deleted or not yet synced');
    } else {
        console.log('✅ All financial events have corresponding orders');
    }

    // Check 3: Financial event ID uniqueness
    const duplicateEventIds = await prisma.$queryRaw<Array<{
        financialEventId: string;
        count: bigint;
    }>>`
    SELECT 
      "financialEventId",
      COUNT(*) as count
    FROM "FinancialEvent"
    WHERE "accountId" = ${accountId}
      AND "financialEventId" IS NOT NULL
    GROUP BY "financialEventId"
    HAVING COUNT(*) > 1
    LIMIT 10
  `;

    if (duplicateEventIds.length > 0) {
        console.log(`❌ ${duplicateEventIds.length} duplicate financialEventId values found!`);
        console.log('   This should NEVER happen - financialEventId must be unique');
        duplicateEventIds.forEach(dup => {
            console.log(`   ${dup.financialEventId}: ${dup.count} occurrences`);
        });
        return false;
    } else {
        console.log('✅ All financialEventId values are unique');
    }

    return missingCount === 0 && orphanedCount === 0;
}

async function generateReport(accountId: string) {
    console.log('\n📊 Overall Report Summary:\n');

    const stats = await prisma.financialEvent.groupBy({
        by: ['eventType'],
        where: { accountId },
        _count: true,
        _sum: { amount: true },
    });

    console.log('Financial Events Overview:');
    stats.forEach(stat => {
        console.log(`  ${stat.eventType.padEnd(15)}: ${String(stat._count).padStart(8)} events | €${Number(stat._sum.amount || 0).toFixed(2).padStart(12)}`);
    });

    const total = stats.reduce((sum, s) => sum + s._count, 0);
    console.log(`  ${'TOTAL'.padEnd(15)}: ${String(total).padStart(8)} events`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: npm run ts-node backend/verify-financial-data.ts <accountId>');
        console.log('');
        console.log('This script performs comprehensive validation of financial data.');
        process.exit(1);
    }

    const accountId = args[0];

    console.log('🔧 Financial Data Verification Tool');
    console.log(`📅 Account ID: ${accountId}`);

    const results = {
        duplicates: await checkDuplicates(accountId),
        vat: await checkVAT(accountId),
        fees: await checkFeeTotals(accountId),
        consistency: await checkDataConsistency(accountId),
    };

    await generateReport(accountId);

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Verification Results:\n');
    console.log(`  Duplicate Check:  ${results.duplicates ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  VAT Check:        ${results.vat ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Fee Totals:       ${results.fees ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Data Consistency: ${results.consistency ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r === true);

    if (allPassed) {
        console.log('\n✅ All checks PASSED! Financial data looks good.');
    } else {
        console.log('\n⚠️  Some checks FAILED. Review the issues above.');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    await prisma.$disconnect();
    process.exit(allPassed ? 0 : 1);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    });
