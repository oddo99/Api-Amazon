
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDoubleRevenue(accountId: string, dryRun: boolean = true) {
    console.log(`🧹 Cleanup Double Revenue & Fees`);
    console.log(`📅 Account: ${accountId}`);
    console.log(`🔒 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    // 1. Cleanup Revenue
    const revenueEvents = await prisma.financialEvent.findMany({
        where: {
            accountId,
            eventType: 'OrderRevenue',
        },
        orderBy: {
            postedDate: 'desc',
        },
    });

    console.log(`🔍 Found ${revenueEvents.length} revenue events. Checking for duplicates...`);

    const eventsByOrder: Record<string, any[]> = {};

    for (const event of revenueEvents) {
        if (!event.amazonOrderId) continue;
        if (!eventsByOrder[event.amazonOrderId]) {
            eventsByOrder[event.amazonOrderId] = [];
        }
        eventsByOrder[event.amazonOrderId].push(event);
    }

    let duplicateGroups = 0;
    let eventsToRemove: string[] = [];

    for (const orderId in eventsByOrder) {
        const orderEvents = eventsByOrder[orderId];
        if (orderEvents.length <= 1) continue;

        const newApiEvents = orderEvents.filter(e => e.description && e.description.startsWith('Revenue - '));
        const oldApiEvents = orderEvents.filter(e => !e.description || !e.description.startsWith('Revenue - '));

        if (newApiEvents.length > 0 && oldApiEvents.length > 0) {
            duplicateGroups++;
            console.log(`\n⚠️  Duplicate Revenue for Order ${orderId}:`);

            for (const oldEvent of oldApiEvents) {
                console.log(`   ❌ REMOVE (Old API): ${oldEvent.postedDate.toISOString().split('T')[0]} | €${oldEvent.amount} | ${oldEvent.description}`);
                eventsToRemove.push(oldEvent.id);
            }

            for (const newEvent of newApiEvents) {
                console.log(`   ✅ KEEP (New API):   ${newEvent.postedDate.toISOString().split('T')[0]} | €${newEvent.amount} | ${newEvent.description}`);
            }
        }
    }

    // 2. Cleanup Fees
    console.log(`\n🔍 Checking for duplicate Fees...`);
    const feeEvents = await prisma.financialEvent.findMany({
        where: {
            accountId,
            eventType: 'Fee',
        },
    });

    const feesByOrder: Record<string, any[]> = {};
    for (const event of feeEvents) {
        if (!event.amazonOrderId) continue;
        if (!feesByOrder[event.amazonOrderId]) {
            feesByOrder[event.amazonOrderId] = [];
        }
        feesByOrder[event.amazonOrderId].push(event);
    }

    for (const orderId in feesByOrder) {
        const orderFees = feesByOrder[orderId];

        // Group by Fee Type
        const feesByType: Record<string, any[]> = {};
        for (const fee of orderFees) {
            const type = fee.feeType || 'Unknown';
            if (!feesByType[type]) feesByType[type] = [];
            feesByType[type].push(fee);
        }

        for (const type in feesByType) {
            const fees = feesByType[type];
            if (fees.length <= 1) continue;

            // Logic: New API IDs end with "-FeeType" (e.g. "-Commission")
            // Old API IDs usually don't (or follow different pattern)

            const newApiFees = fees.filter(f => f.financialEventId && f.financialEventId.endsWith(`-${type}`));
            const oldApiFees = fees.filter(f => !f.financialEventId || !f.financialEventId.endsWith(`-${type}`));

            if (newApiFees.length > 0 && oldApiFees.length > 0) {
                duplicateGroups++;
                console.log(`\n⚠️  Duplicate Fee (${type}) for Order ${orderId}:`);

                for (const oldFee of oldApiFees) {
                    console.log(`   ❌ REMOVE (Old API): ${oldFee.postedDate.toISOString().split('T')[0]} | €${oldFee.amount} | ${oldFee.description} | ID: ${oldFee.financialEventId}`);
                    eventsToRemove.push(oldFee.id);
                }

                for (const newFee of newApiFees) {
                    console.log(`   ✅ KEEP (New API):   ${newFee.postedDate.toISOString().split('T')[0]} | €${newFee.amount} | ${newFee.description} | ID: ${newFee.financialEventId}`);
                }
            }
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Duplicate Groups Found: ${duplicateGroups}`);
    console.log(`   Events to Remove: ${eventsToRemove.length}`);

    if (!dryRun && eventsToRemove.length > 0) {
        console.log(`\n🗑️  Deleting ${eventsToRemove.length} events...`);
        await prisma.financialEvent.deleteMany({
            where: {
                id: { in: eventsToRemove }
            }
        });
        console.log(`✅ Deleted!`);
    }
}

const accountId = process.argv[2];
const mode = process.argv[3];

if (!accountId) {
    console.error('Usage: npx ts-node cleanup-double-revenue.ts <accountId> [--live]');
    process.exit(1);
}

cleanupDoubleRevenue(accountId, mode !== '--live');
