
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugNovemberOrders(accountId: string) {
    const startDate = new Date('2025-11-01T00:00:00Z');
    const endDate = new Date('2025-11-30T23:59:59Z');

    console.log(`📊 Analyzing Orders for November 2025`);
    console.log(`📅 Account: ${accountId}`);

    const orders = await prisma.order.findMany({
        where: {
            accountId,
            purchaseDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            amazonOrderId: true,
            purchaseDate: true,
            orderStatus: true,
            marketplaceId: true,
            totalAmount: true,
        }
    });

    console.log(`📦 Total Orders Found in DB: ${orders.length}`);

    // Group by Marketplace
    const byMarketplace = orders.reduce((acc, order) => {
        acc[order.marketplaceId] = (acc[order.marketplaceId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log(`🌍 By Marketplace:`);
    console.log(byMarketplace);

    // Group by Status
    const byStatus = orders.reduce((acc, order) => {
        acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log(`📊 By Status:`);
    console.log(byStatus);

    // Check last sync
    const lastSync = await prisma.syncJob.findFirst({
        where: { accountId },
        orderBy: { startedAt: 'desc' }
    });

    console.log(`🔄 Last Sync Job:`);
    console.log(lastSync);
}

const accountId = process.argv[2] || 'cmggmot2a0005g9362659z7xx'; // Default to Grifos
debugNovemberOrders(accountId);
