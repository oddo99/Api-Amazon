import { PrismaClient } from '@prisma/client';
import OrderService from '../services/order.service';
import FinanceService from '../services/finance.service';
import InventoryService from '../services/inventory.service';
import { AnalyticsService } from '../services/analytics.service';

const prisma = new PrismaClient();

/**
 * Direct sync without Redis queues
 * Used as fallback when Redis is not available
 */

export async function syncOrders(accountId: string, sellingPartnerId?: string) {
  const syncJob = await prisma.syncJob.create({
    data: {
      accountId,
      jobType: 'orders',
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    const orderService = new OrderService(accountId, sellingPartnerId);
    const result = await orderService.syncOrders(accountId, 730, sellingPartnerId);

    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: result.ordersProcessed,
      },
    });

    return result;
  } catch (error: any) {
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: (error.message || 'Unknown error').substring(0, 500),
      },
    });

    throw error;
  }
}

export async function syncFinances(accountId: string, sellingPartnerId?: string) {
  const syncJob = await prisma.syncJob.create({
    data: {
      accountId,
      jobType: 'finances',
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    const financeService = new FinanceService(accountId, sellingPartnerId);
    const result = await financeService.syncAllTransactions(accountId, 730);

    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: result.transactionsProcessed,
      },
    });

    return result;
  } catch (error: any) {
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: (error.message || 'Unknown error').substring(0, 500),
      },
    });

    throw error;
  }
}

export async function syncInventory(accountId: string, sellingPartnerId?: string) {
  const syncJob = await prisma.syncJob.create({
    data: {
      accountId,
      jobType: 'inventory',
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    const inventoryService = new InventoryService(accountId, sellingPartnerId);
    const result = await inventoryService.syncInventory(accountId, sellingPartnerId);

    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: result.inventoriesProcessed,
      },
    });

    return result;
  } catch (error: any) {
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: (error.message || 'Unknown error').substring(0, 500),
      },
    });

    throw error;
  }
}

export async function syncAnalytics(accountId: string, daysBack: number = 90, sellingPartnerId?: string, aggregation: 'DAY' | 'WEEK' | 'MONTH' = 'DAY') {
  const syncJob = await prisma.syncJob.create({
    data: {
      accountId,
      jobType: 'analytics',
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    const analyticsService = new AnalyticsService(accountId, sellingPartnerId);
    const result = await analyticsService.syncSalesAndTrafficReport(accountId, daysBack, sellingPartnerId, aggregation);

    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: result.metricsByDate + result.metricsByAsin,
      },
    });

    return result;
  } catch (error: any) {
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: (error.message || 'Unknown error').substring(0, 500),
      },
    });

    throw error;
  }
}

export async function syncAll(accountId: string, sellingPartnerId?: string) {
  const results = {
    orders: null as any,
    finances: null as any,
    inventory: null as any,
    analytics: null as any,
    errors: [] as string[],
  };

  // Sync orders
  try {
    results.orders = await syncOrders(accountId, sellingPartnerId);
  } catch (error: any) {
    results.errors.push(`Orders: ${error.message}`);
  }

  // Sync finances
  try {
    results.finances = await syncFinances(accountId, sellingPartnerId);
  } catch (error: any) {
    results.errors.push(`Finances: ${error.message}`);
  }

  // Sync inventory
  try {
    results.inventory = await syncInventory(accountId, sellingPartnerId);
  } catch (error: any) {
    results.errors.push(`Inventory: ${error.message}`);
  }

  // Sync analytics
  try {
    results.analytics = await syncAnalytics(accountId, 90, sellingPartnerId);
  } catch (error: any) {
    results.errors.push(`Analytics: ${error.message}`);
  }

  return results;
}
