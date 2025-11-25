/**
 * Database Cleanup and Backup Script for Financial Events
 * 
 * This script:
 * 1. Creates a backup of all financial events
 * 2. Clears existing financial events for re-sync
 * 3. Provides restore capability if needed
 * 
 * Usage:
 *   npm run ts-node backend/cleanup-financial-events.ts [accountId]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backupFinancialEvents(accountId?: string) {
    console.log('📦 Starting backup of financial events...');

    const where = accountId ? { accountId } : {};

    // Count records to backup
    const count = await prisma.financialEvent.count({ where });
    console.log(`📊 Found ${count.toLocaleString()} financial events to backup`);

    if (count === 0) {
        console.log('✅ No records to backup');
        return 0;
    }

    // Export to JSON file
    const events = await prisma.financialEvent.findMany({
        where,
        orderBy: { postedDate: 'asc' },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `financial-events-backup-${accountId || 'all'}-${timestamp}.json`;
    const fs = require('fs');

    fs.writeFileSync(filename, JSON.stringify(events, null, 2));
    console.log(`✅ Backup saved to: ${filename}`);
    console.log(`💾 Size: ${(fs.statSync(filename).size / 1024 / 1024).toFixed(2)} MB`);

    return count;
}

async function clearFinancialEvents(accountId?: string) {
    console.log('\n🗑️  Clearing financial events...');

    const where = accountId ? { accountId } : {};

    const result = await prisma.financialEvent.deleteMany({ where });
    console.log(`✅ Deleted ${result.count.toLocaleString()} financial events`);

    return result.count;
}

async function showStats(accountId?: string) {
    console.log('\n📊 Current Database Statistics:');

    const where = accountId ? { accountId } : {};

    const total = await prisma.financialEvent.count({ where });
    console.log(`Total Events: ${total.toLocaleString()}`);

    const byType = await prisma.financialEvent.groupBy({
        by: ['eventType'],
        where,
        _count: true,
    });

    console.log('\nBy Event Type:');
    byType.forEach(item => {
        console.log(`  ${item.eventType}: ${item._count.toLocaleString()}`);
    });

    // Check for potential duplicates (same order, sku, fee type)
    // Using Prisma findMany and manual grouping for better database compatibility
    const feeEvents = await prisma.financialEvent.findMany({
        where: {
            ...(accountId && { accountId }),
            eventType: 'Fee',
        },
        select: {
            amazonOrderId: true,
            sku: true,
            feeType: true,
        },
    });

    // Group manually to find duplicates
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

    // Sort by count descending
    duplicates.sort((a, b) => b.count - a.count);

    if (duplicates.length > 0) {
        console.log(`\n⚠️  Found ${duplicates.length} potential duplicate fee groups:`);
        duplicates.forEach(dup => {
            console.log(`  Order ${dup.amazonOrderId} | SKU: ${dup.sku || 'N/A'} | Fee: ${dup.feeType || 'N/A'} | Count: ${dup.count}`);
        });
    } else {
        console.log('\n✅ No duplicate fees detected');
    }
}

async function restoreFromBackup(filename: string) {
    console.log(`📥 Restoring from backup: ${filename}`);

    const fs = require('fs');
    if (!fs.existsSync(filename)) {
        throw new Error(`Backup file not found: ${filename}`);
    }

    const events = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    console.log(`📊 Found ${events.length.toLocaleString()} events in backup`);

    let restored = 0;
    const batchSize = 1000;

    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await prisma.financialEvent.createMany({
            data: batch.map((e: any) => ({
                ...e,
                postedDate: new Date(e.postedDate),
                createdAt: new Date(e.createdAt),
                updatedAt: new Date(e.updatedAt),
            })),
            skipDuplicates: true,
        });
        restored += batch.length;
        console.log(`  Restored ${restored.toLocaleString()} / ${events.length.toLocaleString()}`);
    }

    console.log(`✅ Restoration complete: ${restored.toLocaleString()} events`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const accountId = args[1];

    console.log('🔧 Financial Events Cleanup Tool\n');

    if (command === 'stats') {
        await showStats(accountId);
    } else if (command === 'backup') {
        await backupFinancialEvents(accountId);
    } else if (command === 'clear') {
        // Require explicit confirmation
        console.log('⚠️  WARNING: This will delete all financial events!');
        console.log('⚠️  Make sure you have a backup first!');
        console.log('\nTo proceed, run: npm run ts-node backend/cleanup-financial-events.ts clear-confirmed [accountId]');
    } else if (command === 'clear-confirmed') {
        await clearFinancialEvents(accountId);
    } else if (command === 'full-reset') {
        console.log('🔄 Full Reset Process:\n');
        const count = await backupFinancialEvents(accountId);
        if (count > 0) {
            await clearFinancialEvents(accountId);
            console.log('\n✅ Full reset complete!');
            console.log('Next step: Run sync with syncAllTransactions()');
        }
    } else if (command === 'restore') {
        if (!args[1]) {
            console.log('Usage: npm run ts-node backend/cleanup-financial-events.ts restore <backup-filename>');
            process.exit(1);
        }
        await restoreFromBackup(args[1]);
    } else {
        console.log('Usage:');
        console.log('  npm run ts-node backend/cleanup-financial-events.ts stats [accountId]');
        console.log('  npm run ts-node backend/cleanup-financial-events.ts backup [accountId]');
        console.log('  npm run ts-node backend/cleanup-financial-events.ts clear-confirmed [accountId]');
        console.log('  npm run ts-node backend/cleanup-financial-events.ts full-reset [accountId]');
        console.log('  npm run ts-node backend/cleanup-financial-events.ts restore <backup-filename>');
        console.log('\nExamples:');
        console.log('  npm run ts-node backend/cleanup-financial-events.ts stats');
        console.log('  npm run ts-node backend/cleanup-financial-events.ts full-reset clwk9i5ew0000vajx8yqz9p1e');
    }

    await prisma.$disconnect();
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    });
