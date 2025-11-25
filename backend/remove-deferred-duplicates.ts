/**
 * Remove Duplicate DEFERRED/RELEASED Transactions
 * 
 * Amazon creates two separate financial events for the same order:
 * 1. DEFERRED - When order is placed but payment not yet released
 * 2. RELEASED - When Amazon actually pays the seller
 * 
 * This script keeps only the RELEASED (most recent) version and removes DEFERRED duplicates.
 * 
 * Usage:
 *   npx ts-node backend/remove-deferred-duplicates.ts <accountId> [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
    accountId: string;
    amazonOrderId: string;
    sku: string | null;
    feeType: string | null;
    eventType: string;
    events: Array<{
        id: string;
        postedDate: Date;
        financialEventId: string | null;
        amount: number;
    }>;
}

async function findDuplicates(accountId: string): Promise<DuplicateGroup[]> {
    console.log('🔍 Finding duplicate events...\n');

    // Get all financial events for this account
    const allEvents = await prisma.financialEvent.findMany({
        where: { accountId },
        select: {
            id: true,
            accountId: true,
            amazonOrderId: true,
            sku: true,
            feeType: true,
            eventType: true,
            postedDate: true,
            financialEventId: true,
            amount: true,
        },
        orderBy: { postedDate: 'asc' },
    });

    console.log(`Total events: ${allEvents.length}`);

    // Group by unique combination
    const groups = new Map<string, DuplicateGroup>();

    allEvents.forEach(event => {
        const key = `${event.accountId}|${event.amazonOrderId || 'null'}|${event.sku || 'null'}|${event.feeType || 'null'}|${event.eventType}`;

        if (!groups.has(key)) {
            groups.set(key, {
                accountId: event.accountId,
                amazonOrderId: event.amazonOrderId || '',
                sku: event.sku,
                feeType: event.feeType,
                eventType: event.eventType,
                events: [],
            });
        }

        groups.get(key)!.events.push({
            id: event.id,
            postedDate: event.postedDate,
            financialEventId: event.financialEventId,
            amount: event.amount,
        });
    });

    // Filter to only groups with duplicates
    const duplicateGroups: DuplicateGroup[] = [];
    groups.forEach(group => {
        if (group.events.length > 1) {
            duplicateGroups.push(group);
        }
    });

    return duplicateGroups;
}

async function removeDuplicates(accountId: string, dryRun: boolean = false) {
    const duplicateGroups = await findDuplicates(accountId);

    if (duplicateGroups.length === 0) {
        console.log('✅ No duplicates found!');
        return {
            duplicateGroups: 0,
            eventsToRemove: 0,
            eventsToKeep: 0,
        };
    }

    console.log(`\n⚠️  Found ${duplicateGroups.length} duplicate groups`);

    let totalEventsToRemove = 0;
    let totalEventsToKeep = 0;
    const idsToDelete: string[] = [];

    // Process each duplicate group
    duplicateGroups.forEach((group, index) => {
        // Sort by postedDate descending (most recent first)
        group.events.sort((a, b) => b.postedDate.getTime() - a.postedDate.getTime());

        const mostRecent = group.events[0];
        const toRemove = group.events.slice(1);

        totalEventsToKeep++;
        totalEventsToRemove += toRemove.length;

        // Show first 10 examples
        if (index < 10) {
            console.log(`\n${index + 1}. Order: ${group.amazonOrderId} | SKU: ${group.sku || 'N/A'} | ${group.eventType} - ${group.feeType || 'N/A'}`);
            console.log(`   ✅ KEEP (most recent): ${mostRecent.postedDate.toISOString().split('T')[0]} | €${mostRecent.amount} | EventID: ${mostRecent.financialEventId?.substring(0, 15)}...`);
            toRemove.forEach(old => {
                console.log(`   ❌ REMOVE (older):     ${old.postedDate.toISOString().split('T')[0]} | €${old.amount} | EventID: ${old.financialEventId?.substring(0, 15)}...`);
            });
        }

        // Collect IDs to delete
        toRemove.forEach(event => idsToDelete.push(event.id));
    });

    if (duplicateGroups.length > 10) {
        console.log(`\n... and ${duplicateGroups.length - 10} more duplicate groups`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total duplicate groups: ${duplicateGroups.length}`);
    console.log(`   Events to KEEP (most recent): ${totalEventsToKeep}`);
    console.log(`   Events to REMOVE (older): ${totalEventsToRemove}`);

    if (dryRun) {
        console.log(`\n🔒 DRY RUN - No changes made`);
        console.log(`   Remove --dry-run flag to actually delete duplicates`);
        return {
            duplicateGroups: duplicateGroups.length,
            eventsToRemove: totalEventsToRemove,
            eventsToKeep: totalEventsToKeep,
        };
    }

    // Confirm before deletion
    console.log(`\n⚠️  About to DELETE ${totalEventsToRemove} events!`);
    console.log(`   Waiting 5 seconds... Press Ctrl+C to cancel`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete in batches
    const batchSize = 1000;
    let deleted = 0;

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const result = await prisma.financialEvent.deleteMany({
            where: {
                id: { in: batch },
            },
        });
        deleted += result.count;
        console.log(`   Deleted ${deleted} / ${totalEventsToRemove}...`);
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Removed ${deleted} duplicate events`);
    console.log(`   Kept ${totalEventsToKeep} most recent events`);

    // Show final stats
    const finalCount = await prisma.financialEvent.count({ where: { accountId } });
    const byType = await prisma.financialEvent.groupBy({
        by: ['eventType'],
        where: { accountId },
        _count: true,
    });

    console.log(`\n📈 Final Statistics:`);
    console.log(`   Total events: ${finalCount}`);
    byType.forEach(t => console.log(`   ${t.eventType}: ${t._count}`));

    return {
        duplicateGroups: duplicateGroups.length,
        eventsToRemove: totalEventsToRemove,
        eventsToKeep: totalEventsToKeep,
    };
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: npx ts-node backend/remove-deferred-duplicates.ts <accountId> [--dry-run]');
        console.log('');
        console.log('Example:');
        console.log('  npx ts-node backend/remove-deferred-duplicates.ts cmgpgl4dt01e63nj3ptbfommh --dry-run');
        console.log('  npx ts-node backend/remove-deferred-duplicates.ts cmgpgl4dt01e63nj3ptbfommh');
        console.log('');
        console.log('This removes duplicate DEFERRED events, keeping only RELEASED (most recent) versions.');
        process.exit(1);
    }

    const accountId = args[0];
    const dryRun = args.includes('--dry-run');

    console.log('🧹 Duplicate DEFERRED/RELEASED Event Cleanup');
    console.log(`📅 Account: ${accountId}`);
    console.log(`🔒 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will delete duplicates)'}`);
    console.log('');

    await removeDuplicates(accountId, dryRun);
    await prisma.$disconnect();
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    });
