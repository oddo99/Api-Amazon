import Queue from 'bull';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';
import OrderService from '../services/order.service';
import FinanceService from '../services/finance.service';
import InventoryService from '../services/inventory.service';
import ReportService from '../services/report.service';
import AnalyticsService from '../services/analytics.service';

const prisma = new PrismaClient();

// Create queues
export const ordersQueue = new Queue('orders-sync', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

export const financesQueue = new Queue('finances-sync', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

export const inventoryQueue = new Queue('inventory-sync', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

export const analyticsQueue = new Queue('analytics-sync', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

// Process orders sync
ordersQueue.process(async (job) => {
  const { accountId, sellingPartnerId, daysBack = 730, useReports = false } = job.data;

  const syncJob = await prisma.syncJob.create({
    data: {
      accountId,
      jobType: 'orders',
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    let result;

    // Use Reports API for full/large syncs (much faster!)
    // Use Orders API for incremental syncs (more up-to-date)
    if (useReports || daysBack > 30) {
      console.log(`📊 Using Reports API for orders sync (${daysBack} days)`);
      const reportService = new ReportService(accountId, sellingPartnerId);
      result = await reportService.syncOrdersViaReport(accountId, daysBack, sellingPartnerId);
    } else {
      console.log(`📦 Using Orders API for incremental sync (${daysBack} days)`);
      console.log(`   Using LastUpdatedAfter to catch order updates and changes`);
      const orderService = new OrderService(accountId, sellingPartnerId);
      // Use LastUpdatedAfter for incremental syncs to catch both new orders AND updated orders
      result = await orderService.syncOrders(accountId, daysBack, sellingPartnerId, true);
    }

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
});

// Process finances sync
financesQueue.process(async (job) => {
  const { accountId, sellingPartnerId } = job.data;

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

    // Sync using old Financial Events API (for ServiceFees and historical data)
    const result = await financeService.syncFinancialEvents(accountId, 730, sellingPartnerId);

    // Sync using new Transactions API (for DEFERRED, DEFERRED_RELEASED, RELEASED transactions)
    // Only sync recent 45 days to capture deferred transactions
    console.log('\n📊 Syncing transactions via new Finances API v2024-06-19...');
    const transactionsResult = await financeService.syncAllTransactions(accountId, 45);

    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: result.eventsProcessed + transactionsResult.transactionsProcessed,
      },
    });

    return {
      ...result,
      transactionsProcessed: transactionsResult.transactionsProcessed
    };
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
});

// Process inventory sync
inventoryQueue.process(async (job) => {
  const { accountId, sellingPartnerId } = job.data;

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
});

// Process analytics sync
analyticsQueue.process(async (job) => {
  const { accountId, sellingPartnerId, daysBack = 90 } = job.data;

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
    const result = await analyticsService.syncSalesAndTrafficReport(accountId, daysBack, sellingPartnerId, 'DAY');

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
});

// Schedule repeating jobs
export function scheduleJobs(accountId: string, sellingPartnerId: string) {
  // Sync orders every 5 minutes (incremental: last 7 days)
  ordersQueue.add(
    { accountId, sellingPartnerId, daysBack: 7 },
    {
      repeat: {
        every: config.sync.ordersInterval,
      },
    }
  );

  // Sync finances every 10 minutes
  financesQueue.add(
    { accountId, sellingPartnerId },
    {
      repeat: {
        every: config.sync.financesInterval,
      },
    }
  );

  // Sync inventory every 15 minutes
  inventoryQueue.add(
    { accountId, sellingPartnerId },
    {
      repeat: {
        every: config.sync.inventoryInterval,
      },
    }
  );

  // Sync analytics every 30 minutes (Sales & Traffic data - requires 90 days lookback)
  analyticsQueue.add(
    { accountId, sellingPartnerId, daysBack: 90 },
    {
      repeat: {
        every: 1800000, // 30 minutes
      },
    }
  );

  console.log(`Scheduled sync jobs for account ${accountId}`);
}

// Trigger immediate sync
export async function triggerSync(accountId: string, type?: 'orders' | 'finances' | 'inventory' | 'analytics', sellingPartnerId?: string) {
  if (!type || type === 'orders') {
    // Use Report API for full sync (get last 730 days via Reports API)
    console.log(`🔄 Triggering manual sync - Orders using Report API for full historical data (730 days)`);
    await ordersQueue.add({
      accountId,
      sellingPartnerId,
      daysBack: 730,  // Use Reports API for full 2-year sync
      useReports: true  // Force Reports API
    });
  }

  if (!type || type === 'finances') {
    console.log(`🔄 Triggering manual sync - Finances`);
    await financesQueue.add({ accountId, sellingPartnerId });
  }

  if (!type || type === 'inventory') {
    console.log(`🔄 Triggering manual sync - Inventory`);
    await inventoryQueue.add({ accountId, sellingPartnerId });
  }

  if (!type || type === 'analytics') {
    console.log(`🔄 Triggering manual sync - Analytics (Sales & Traffic, 90 days)`);
    await analyticsQueue.add({ accountId, sellingPartnerId, daysBack: 90 });
  }
}
