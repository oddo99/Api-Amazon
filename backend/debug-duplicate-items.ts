
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicateItems(accountId: string) {
    console.log(`🔍 Checking for duplicate items in account ${accountId}...`);

    // Find orders with multiple items of same SKU
    const orders = await prisma.order.findMany({
        where: { accountId },
        include: { items: true }
    });

    let duplicateCount = 0;
    let affectedOrders = 0;

    for (const order of orders) {
        const skuMap = new Map<string, any[]>();

        for (const item of order.items) {
            if (!skuMap.has(item.sku)) {
                skuMap.set(item.sku, []);
            }
            skuMap.get(item.sku)?.push(item);
        }

        let hasDupes = false;
        skuMap.forEach((items, sku) => {
            if (items.length > 1) {
                // Check if they are actually duplicates (same SKU, maybe different prices)
                // Sometimes quantity > 1 means multiple items, but usually they are grouped in one line item
                // Unless Amazon splits them into different OrderItemIds

                // Check OrderItemIds
                const itemIds = items.map(i => i.id);
                // If IDs are different, they are stored as different rows

                console.log(`\nOrder ${order.amazonOrderId} - SKU ${sku}: Found ${items.length} items`);
                items.forEach(i => {
                    console.log(`   ID: ${i.id} | Price: ${i.itemPrice} | Tax: ${i.itemTax} | Qty: ${i.quantity}`);
                });

                hasDupes = true;
                duplicateCount += items.length - 1;
            }
        });

        if (hasDupes) affectedOrders++;
        if (affectedOrders >= 10) break; // Limit output
    }

    console.log(`\nFound potential duplicates in ${affectedOrders} orders (showing first 10)`);
}

const accountId = process.argv[2] || 'cmgpgl4dt01e63nj3ptbfommh';
checkDuplicateItems(accountId);
