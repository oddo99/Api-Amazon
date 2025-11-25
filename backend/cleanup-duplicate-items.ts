
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateItems(accountId: string, dryRun: boolean = true) {
    console.log(`🧹 Cleaning up duplicate items for account ${accountId}`);
    console.log(`🔒 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    const orders = await prisma.order.findMany({
        where: { accountId },
        include: { items: true }
    });

    let deletedCount = 0;
    let itemsToDelete: string[] = [];

    for (const order of orders) {
        const skuMap = new Map<string, any[]>();

        for (const item of order.items) {
            if (!skuMap.has(item.sku)) {
                skuMap.set(item.sku, []);
            }
            skuMap.get(item.sku)?.push(item);
        }

        skuMap.forEach((items, sku) => {
            if (items.length > 1) {
                // We have duplicates. Identify which one to keep.
                // Strategy: Keep the one with CUID-based ID (new format) and Net price.
                // Remove the one with AmazonOrderId-based ID (old format).

                const keep = items.find(i => i.id.startsWith(order.id));
                const remove = items.filter(i => !i.id.startsWith(order.id));

                if (keep && remove.length > 0) {
                    // Classic case: New format exists, remove old ones
                    remove.forEach(i => {
                        itemsToDelete.push(i.id);
                        console.log(`   🗑️  Marking for deletion: ${i.id} (Price: ${i.itemPrice}) - Duplicate of ${keep.id}`);
                    });
                } else if (!keep && remove.length > 1) {
                    // Edge case: Only old formats exist? Or multiple new formats?
                    // If multiple items exist but none start with order.id (unlikely based on analysis),
                    // or all start with order.id (also unlikely).
                    // Let's stick to the safe rule: Only delete if we are sure it's the "old" format AND we have a "new" format.
                    console.log(`   ⚠️  Ambiguous duplicates for Order ${order.amazonOrderId} SKU ${sku}. Skipping manual check.`);
                }
            }
        });
    }

    console.log(`\nFound ${itemsToDelete.length} items to delete.`);

    if (!dryRun && itemsToDelete.length > 0) {
        console.log(`Deleting items...`);
        // Delete in batches
        const BATCH_SIZE = 1000;
        for (let i = 0; i < itemsToDelete.length; i += BATCH_SIZE) {
            const batch = itemsToDelete.slice(i, i + BATCH_SIZE);
            await prisma.orderItem.deleteMany({
                where: {
                    id: { in: batch }
                }
            });
            console.log(`   Deleted batch ${i / BATCH_SIZE + 1}`);
        }
        console.log(`✅ Deleted ${itemsToDelete.length} duplicate items.`);
    } else {
        console.log(`Dry run complete. No changes made.`);
    }

    await prisma.$disconnect();
}

const accountId = process.argv[2] || 'cmgpgl4dt01e63nj3ptbfommh';
const dryRun = process.argv.includes('--live') ? false : true;

cleanupDuplicateItems(accountId, dryRun);
