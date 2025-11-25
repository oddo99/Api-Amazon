import { PrismaClient } from '@prisma/client';
import { OrderService } from './src/services/order.service';

const prisma = new PrismaClient();

async function syncOrders(accountId: string, daysBack: number = 30) {
    console.log(`📦 Syncing Orders for last ${daysBack} days`);
    console.log(`📅 Account: ${accountId}`);

    const account = await prisma.account.findUnique({
        where: { id: accountId },
    });

    if (!account) {
        console.error('❌ Account not found');
        process.exit(1);
    }

    const orderService = new OrderService(accountId, account.sellerId);

    try {
        const result = await orderService.syncOrders(accountId, daysBack);
        console.log('✅ Sync completed successfully!');
        console.log(`📊 Orders processed: ${result.ordersProcessed}`);
    } catch (error: any) {
        console.error('❌ Sync failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

const accountId = process.argv[2];
const daysBack = parseInt(process.argv[3] || '30');

if (!accountId) {
    console.error('Usage: npx ts-node sync-orders.ts <accountId> [daysBack]');
    process.exit(1);
}

syncOrders(accountId, daysBack);
