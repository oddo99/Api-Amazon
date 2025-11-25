import { PrismaClient } from '@prisma/client';
import OrderService from '../services/order.service';
import FinanceService from '../services/finance.service';
import InventoryService from '../services/inventory.service';
import ReportService from '../services/report.service';
import AnalyticsService from '../services/analytics.service';

const prisma = new PrismaClient();

// Direct sync without Redis - for serverless deployment
export async function triggerSync(accountId: string, type?: 'orders' | 'finances' | 'inventory' | 'analytics' | 'all', sellingPartnerId?: string) {
  console.log(`🔄 Starting direct sync for account ${accountId}, type: ${type || 'all'}`);

  const results: any = {};

  try {
    if (!type || type === 'all' || type === 'orders') {
      console.log('📦 Syncing orders...');
      const syncJob = await prisma.syncJob.create({
        data: {
          accountId,
          jobType: 'orders',
          status: 'running',
          startedAt: new Date(),
        },
      });

      try {
        const reportService = new ReportService(accountId, sellingPartnerId);
        const result = await reportService.syncOrdersViaReport(accountId, 730, sellingPartnerId);

        await prisma.syncJob.update({
          where: { id: syncJob.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            recordsProcessed: result.ordersProcessed,
          },
        });

        results.orders = result;
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

    if (!type || type === 'all' || type === 'finances') {
      console.log('💰 Syncing finances...');
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

        results.finances = result;
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

    if (!type || type === 'all' || type === 'inventory') {
      console.log('📊 Syncing inventory...');
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

        results.inventory = result;
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

    console.log('✅ Sync completed successfully');
    return results;
  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// Dummy functions for compatibility
export function scheduleJobs(accountId: string, sellingPartnerId: string) {
  console.log(`⚠️  Scheduled jobs not available in serverless mode`);
}

export const ordersQueue = null;
export const financesQueue = null;
export const inventoryQueue = null;
export const analyticsQueue = null;
