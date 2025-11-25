import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
    const accountId = 'cmgpgl4dt01e63nj3ptbfommh';

    // Total events for this account
    const total = await prisma.financialEvent.count({
        where: { accountId },
    });

    console.log(`Total events for account: ${total}`);

    // By type
    const byType = await prisma.financialEvent.groupBy({
        by: ['eventType'],
        where: { accountId },
        _count: true,
    });

    console.log('\nBy type:');
    byType.forEach(t => console.log(`  ${t.eventType}: ${t._count}`));

    // Check one specific duplicate from the output
    const testOrder = '403-8857824-3703548';
    const testSKU = 'SG-UBRH-8BTH';

    const feeEvents = await prisma.financialEvent.findMany({
        where: {
            accountId,
            amazonOrderId: testOrder,
            sku: testSKU,
            eventType: 'Fee',
        },
        select: {
            id: true,
            feeType: true,
            amount: true,
            financialEventId: true,
            postedDate: true,
        },
    });

    console.log(`\nTest order ${testOrder} SKU ${testSKU}:`);
    console.log(`Found ${feeEvents.length} fee events`);
    feeEvents.forEach(e => {
        console.log(`  ${e.feeType}: €${e.amount} | EventID: ${e.financialEventId?.substring(0, 20)}... | Date: ${e.postedDate.toISOString()}`);
    });

    await prisma.$disconnect();
}

checkDatabase();
