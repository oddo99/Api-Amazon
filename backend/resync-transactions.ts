/**
 * Re-sync Financial Events using ONLY Transactions API
 * 
 * This script uses the Transactions API (v2024-06-19) to fetch all financial data.
 * This is the recommended approach to avoid duplicate fee processing.
 * 
 * Usage:
 *   npm run ts-node backend/resync-transactions.ts <accountId> [daysBack]
 * 
 * Example:
 *   npm run ts-node backend/resync-transactions.ts clwk9i5ew0000vajx8yqz9p1e 730
 */

import { PrismaClient } from '@prisma/client';
import { FinanceService } from './src/services/finance.service';

const prisma = new PrismaClient();

async function resyncTransactions(accountId: string, daysBack: number = 730) {
    console.log('🔄 Starting Transactions API Sync');
    console.log(`📅 Account: ${accountId}`);
    console.log(`📆 Days back: ${daysBack}`);
    console.log('');

    // Get account info
    const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: {
            id: true,
            name: true,
            marketplaceId: true,
            sellerId: true,
        },
    });

    if (!account) {
        throw new Error(`Account not found: ${accountId}`);
    }

    console.log(`Account: ${account.name || account.id}`);
    console.log(`Marketplace: ${account.marketplaceId || 'N/A'}`);
    console.log(`Seller ID: ${account.sellerId || 'N/A'}`);
    console.log('');

    // Check current financial events
    const existingCount = await prisma.financialEvent.count({
        where: { accountId },
    });

    console.log(`📊 Existing financial events: ${existingCount.toLocaleString()}`);

    if (existingCount > 0) {
        console.log('⚠️  WARNING: Existing financial events detected!');
        console.log('⚠️  This sync may create duplicates if events already exist.');
        console.log('⚠️  Consider running cleanup-financial-events.ts first.');
        console.log('');

        // Wait 5 seconds to allow user to cancel
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Initialize Finance Service
    const financeService = new FinanceService(accountId);

    console.log('\n🚀 Starting sync with Transactions API (v2024-06-19)...\n');

    const startTime = Date.now();

    try {
        const result = await financeService.syncAllTransactions(accountId, daysBack);

        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

        console.log('\n✅ Sync completed successfully!');
        console.log(`⏱️  Duration: ${duration} minutes`);
        console.log(`📊 Transactions processed: ${result.transactionsProcessed?.toLocaleString() || 'N/A'}`);

        // Show final stats
        const finalCount = await prisma.financialEvent.count({
            where: { accountId },
        });

        const newEvents = finalCount - existingCount;
        console.log(`\n📈 Final Statistics:`);
        console.log(`  Previous events: ${existingCount.toLocaleString()}`);
        console.log(`  New events added: ${newEvents.toLocaleString()}`);
        console.log(`  Total events: ${finalCount.toLocaleString()}`);

        // Show breakdown by event type
        const byType = await prisma.financialEvent.groupBy({
            by: ['eventType'],
            where: { accountId },
            _count: true,
        });

        console.log('\n📊 Events by Type:');
        byType.forEach(item => {
            console.log(`  ${item.eventType}: ${item._count.toLocaleString()}`);
        });

        // Check for duplicates using Prisma for database compatibility
        const feeEvents = await prisma.financialEvent.findMany({
            where: {
                accountId,
                eventType: 'Fee',
            },
            select: {
                amazonOrderId: true,
                sku: true,
                feeType: true,
            },
        });

        //Group manually
        const groups = new Map<string, number>();
        feeEvents.forEach(event => {
            const key = `${event.amazonOrderId}|${event.sku || 'null'}|${event.feeType || 'null'}`;
            groups.set(key, (groups.get(key) || 0) + 1);
        });

        const duplicates: Array<{
            amazonOrderId: string;
            sku: string | null;
            feeType: string | null;
            count: number;
        }> = [];

        groups.forEach((count, key) => {
            if (count > 1) {
                const [amazonOrderId, sku, feeType] = key.split('|');
                duplicates.push({
                    amazonOrderId,
                    sku: sku === 'null' ? null : sku,
                    feeType: feeType === 'null' ? null : feeType,
                    count,
                });
            }
        });

        duplicates.sort((a, b) => b.count - a.count);

        if (duplicates.length > 0) {
            console.log(`\n⚠️  WARNING: Found ${duplicates.length} potential duplicate fee groups:`);
            duplicates.forEach(dup => {
                console.log(`  Order ${dup.amazonOrderId} | SKU: ${dup.sku || 'N/A'} | Fee: ${dup.feeType || 'N/A'} | Count: ${dup.count}`);
            });
            console.log('\n💡 Tip: Run cleanup-financial-events.ts to investigate duplicates');
        } else {
            console.log('\n✅ No duplicate fees detected');
        }

    } catch (error) {
        console.error('\n❌ Sync failed:', error);
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: npm run ts-node backend/resync-transactions.ts <accountId> [daysBack]');
        console.log('');
        console.log('Example:');
        console.log('  npm run ts-node backend/resync-transactions.ts clwk9i5ew0000vajx8yqz9p1e 730');
        console.log('');
        console.log('Note: This uses ONLY the Transactions API to avoid duplicate fees.');
        process.exit(1);
    }

    const accountId = args[0];
    const daysBack = args[1] ? parseInt(args[1]) : 730;

    if (isNaN(daysBack) || daysBack <= 0) {
        console.error('Invalid daysBack value. Must be a positive number.');
        process.exit(1);
    }

    await resyncTransactions(accountId, daysBack);
    await prisma.$disconnect();
}

main()
    .catch((e) => {
        console.error('Fatal error:', e);
        process.exit(1);
    });
