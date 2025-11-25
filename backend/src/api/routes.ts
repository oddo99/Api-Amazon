import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import OrderService from '../services/order.service';
import FinanceService from '../services/finance.service';
import InventoryService from '../services/inventory.service';
import * as directSync from '../jobs/sync.direct';
import { ordersQueue, financesQueue, inventoryQueue } from '../jobs/sync.jobs';
import { subDays } from 'date-fns';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorizeAccount, getUserAccessibleAccounts } from '../middleware/authorization.middleware';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Account routes
router.get('/accounts', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get accessible account IDs for this user
    const accessibleAccountIds = await getUserAccessibleAccounts(user.id, user.role);

    // Get accounts user has access to
    const accounts = await prisma.account.findMany({
      where: {
        id: {
          in: accessibleAccountIds,
        },
      },
      select: {
        id: true,
        sellerId: true,
        name: true,
        marketplaceId: true,
        region: true,
        isSolutionProvider: true,
        merchantId: true,
        advertisingId: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive fields: accessToken, refreshToken
      },
    });

    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/accounts/:accountId', authorizeAccount, async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.accountId },
      select: {
        id: true,
        sellerId: true,
        name: true,
        marketplaceId: true,
        region: true,
        isSolutionProvider: true,
        merchantId: true,
        advertisingId: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive fields: accessToken, refreshToken
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard/Analytics routes
router.get('/dashboard/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { days, startDate: startParam, endDate: endParam, marketplaceIds, skus } = req.query;

    // Support both days parameter and custom date range
    let startDate: Date;
    let endDate: Date;

    if (startParam && endParam) {
      // Parse dates in local timezone
      const [startYear, startMonth, startDay] = (startParam as string).split('-').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

      const [endYear, endMonth, endDay] = (endParam as string).split('-').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    } else {
      const daysBack = parseInt((days as string) || '30');
      startDate = subDays(new Date(), daysBack);
      endDate = new Date();
    }

    const financeService = new FinanceService(accountId);
    const profit = await financeService.calculateProfit(accountId, {
      startDate,
      endDate,
      marketplaceIds: marketplaceIds ? (marketplaceIds as string).split(',') : undefined,
      skus: skus ? (skus as string).split(',') : undefined,
    });

    res.json({
      period: { startDate, endDate },
      ...profit,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/:accountId/daily', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { days, startDate: startParam, endDate: endParam, marketplaceIds, skus } = req.query;

    let startDate: Date;
    let endDate: Date;

    if (startParam && endParam) {
      // Parse dates in local timezone
      const [startYear, startMonth, startDay] = (startParam as string).split('-').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

      const [endYear, endMonth, endDay] = (endParam as string).split('-').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    } else {
      const daysBack = parseInt((days as string) || '30');
      startDate = subDays(new Date(), daysBack);
      endDate = new Date();
    }

    const financeService = new FinanceService(accountId);
    const dailyStats = await financeService.getDailyStats(accountId, {
      startDate,
      endDate,
      marketplaceIds: marketplaceIds ? (marketplaceIds as string).split(',') : undefined,
      skus: skus ? (skus as string).split(',') : undefined,
    });

    res.json(dailyStats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Orders routes
router.get('/orders/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate, status, marketplaceId } = req.query;

    // Parse dates correctly to avoid timezone issues
    // When we receive "2025-10-17", we want to match orders from the start to end of that day in local time
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      // Parse as local date at start of day (00:00:00)
      const [year, month, day] = (startDate as string).split('-').map(Number);
      parsedStartDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (endDate) {
      // Parse as local date at end of day (23:59:59.999)
      const [year, month, day] = (endDate as string).split('-').map(Number);
      parsedEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    // Support multiple statuses and marketplaces (comma-separated)
    const statuses = status ? (status as string).split(',') : undefined;
    const marketplaceIds = marketplaceId ? (marketplaceId as string).split(',') : undefined;

    const orderService = new OrderService(accountId);
    const orders = await orderService.getOrders(accountId, {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      statuses,
      marketplaceIds,
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:accountId/:orderId', authorizeAccount, async (req, res) => {
  try {
    const { accountId, orderId } = req.params;

    const orderService = new OrderService(accountId);
    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Products routes
router.get('/products/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    // If date range provided, return top selling products in that period
    if (startDate && endDate) {
      // Parse dates in local timezone
      const [startYear, startMonth, startDay] = (startDate as string).split('-').map(Number);
      const parsedStartDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

      const [endYear, endMonth, endDay] = (endDate as string).split('-').map(Number);
      const parsedEndDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

      const topProducts = await prisma.$queryRaw<Array<{
        productId: string;
        sku: string;
        title: string;
        asin: string;
        price: number | null;
        cost: number | null;
        units: number;
        sales: number;
        profit: number;
        margin: number;
      }>>`
        SELECT
          p.id as productId,
          p.sku,
          p.title,
          p.asin,
          p.price,
          p.cost,
          SUM(oi.quantity) as units,
          SUM(
            CASE
              WHEN oi.itemPrice > 0 THEN oi.itemPrice * oi.quantity
              WHEN p.price IS NOT NULL THEN p.price * oi.quantity
              ELSE 0
            END
          ) as sales,
          SUM(
            CASE
              WHEN oi.itemPrice > 0 THEN oi.itemPrice * oi.quantity
              WHEN p.price IS NOT NULL THEN p.price * oi.quantity
              ELSE 0
            END
          ) - COALESCE(SUM(p.cost * oi.quantity), 0) as profit,
          CASE
            WHEN SUM(
              CASE
                WHEN oi.itemPrice > 0 THEN oi.itemPrice * oi.quantity
                WHEN p.price IS NOT NULL THEN p.price * oi.quantity
                ELSE 0
              END
            ) > 0
            THEN ((SUM(
              CASE
                WHEN oi.itemPrice > 0 THEN oi.itemPrice * oi.quantity
                WHEN p.price IS NOT NULL THEN p.price * oi.quantity
                ELSE 0
              END
            ) - COALESCE(SUM(p.cost * oi.quantity), 0)) / SUM(
              CASE
                WHEN oi.itemPrice > 0 THEN oi.itemPrice * oi.quantity
                WHEN p.price IS NOT NULL THEN p.price * oi.quantity
                ELSE 0
              END
            )) * 100
            ELSE 0
          END as margin
        FROM Product p
        INNER JOIN OrderItem oi ON p.id = oi.productId
        INNER JOIN \`Order\` o ON oi.orderId = o.id
        WHERE p.accountId = ${accountId}
          AND o.purchaseDate >= ${parsedStartDate}
          AND o.purchaseDate <= ${parsedEndDate}
          AND o.orderStatus != 'Canceled'
        GROUP BY p.id, p.sku, p.title, p.asin, p.price, p.cost
        ORDER BY units DESC
        LIMIT 10
      `;

      res.json(topProducts);
    } else {
      // Return all products if no date range
      const products = await prisma.product.findMany({
        where: { accountId },
        include: {
          inventory: true,
        },
      });

      res.json(products);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Products grouped by ASIN with SKU details
router.get('/products/:accountId/by-asin', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { marketplaceId } = req.query;

    // Calculate date range for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get all products grouped by ASIN
    const products = await prisma.product.findMany({
      where: {
        accountId,
        ...(marketplaceId ? { marketplaceId: marketplaceId as string } : {}),
      },
      include: {
        inventory: true,
      },
      orderBy: {
        asin: 'asc',
      },
    });

    // Group products by ASIN
    const productsByAsin = products.reduce((acc: any, product: any) => {
      if (!acc[product.asin]) {
        acc[product.asin] = {
          asin: product.asin,
          title: product.title,
          imageUrl: product.imageUrl,
          skus: [],
        };
      }

      // Calculate sales for this SKU (last 30 days)
      const sales = prisma.orderItem.aggregate({
        _sum: {
          quantity: true,
        },
        where: {
          sku: product.sku,
          order: {
            accountId,
            purchaseDate: {
              gte: startDate,
              lte: endDate,
            },
            orderStatus: {
              not: 'Canceled',
            },
          },
        },
      });

      // Calculate revenue for this SKU (last 30 days)
      const revenue = prisma.orderItem.findMany({
        where: {
          sku: product.sku,
          order: {
            accountId,
            purchaseDate: {
              gte: startDate,
              lte: endDate,
            },
            orderStatus: {
              not: 'Canceled',
            },
          },
        },
        include: {
          order: true,
          product: true,
        },
      });

      acc[product.asin].skus.push({
        id: product.id,
        sku: product.sku,
        marketplaceId: product.marketplaceId,
        price: product.price,
        cost: product.cost,
        stock: product.inventory.reduce((sum: any, inv: any) => sum + inv.fulfillableQty, 0),
        salesPromise: sales,
        revenuePromise: revenue,
      });

      return acc;
    }, {} as Record<string, any>);

    // Wait for all promises to resolve
    const asinList = await Promise.all(
      Object.values(productsByAsin).map(async (asinGroup: any) => {
        const skusWithSales = await Promise.all(
          asinGroup.skus.map(async (sku: any) => {
            const salesData = await sku.salesPromise;
            const revenueData = await sku.revenuePromise;

            // Calculate revenue using itemPrice or fallback to product price
            const totalRevenue = revenueData.reduce((sum: number, item: any) => {
              const itemPrice = item.itemPrice > 0 ? item.itemPrice : (item.product?.price || 0);
              return sum + (itemPrice * item.quantity);
            }, 0);

            return {
              id: sku.id,
              sku: sku.sku,
              marketplaceId: sku.marketplaceId,
              price: sku.price,
              cost: sku.cost,
              stock: sku.stock,
              sales30d: {
                revenue: totalRevenue,
                units: salesData._sum.quantity || 0,
              },
            };
          })
        );

        return {
          asin: asinGroup.asin,
          title: asinGroup.title,
          imageUrl: asinGroup.imageUrl,
          skus: skusWithSales,
        };
      })
    );

    res.json(asinList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/:accountId/:productId', authorizeAccount, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: true,
        orderItems: {
          include: {
            order: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get product orders by SKU and date range
router.get('/products/:accountId/:sku/orders', authorizeAccount, async (req, res) => {
  try {
    const { accountId, sku } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Parse dates in local timezone
    const [startYear, startMonth, startDay] = (startDate as string).split('-').map(Number);
    const parsedStartDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

    const [endYear, endMonth, endDay] = (endDate as string).split('-').map(Number);
    const parsedEndDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    // Get the product to use its price as fallback
    const product = await prisma.product.findFirst({
      where: { accountId, sku }
    });

    const orders = await prisma.order.findMany({
      where: {
        accountId,
        purchaseDate: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
        orderStatus: {
          not: 'Canceled'
        },
        items: {
          some: {
            sku: sku
          }
        }
      },
      include: {
        items: {
          where: {
            sku: sku
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    });

    // Get financial event IDs for all orders
    const orderIds = orders.map((o: any) => o.amazonOrderId);
    const financialEvents = await prisma.financialEvent.findMany({
      where: {
        amazonOrderId: { in: orderIds },
        eventType: 'OrderRevenue',
        financialEventId: { not: null },
      },
      select: {
        amazonOrderId: true,
        financialEventId: true,
      },
    });

    // Create a map of amazonOrderId -> financialEventId
    const financialEventMap = new Map(
      financialEvents.map((fe: any) => [fe.amazonOrderId, fe.financialEventId])
    );

    // Apply fallback pricing logic and add financialEventId
    const ordersWithCorrectPrices = orders.map((order: any) => ({
      ...order,
      financialEventId: financialEventMap.get(order.amazonOrderId) || null,
      items: order.items.map((item: any) => ({
        ...item,
        itemPrice: item.itemPrice > 0 ? item.itemPrice : (product?.price || 0)
      }))
    }));

    res.json(ordersWithCorrectPrices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (LOCAL DATABASE ONLY - does NOT modify Amazon)
router.put('/products/:accountId/:productId', authorizeAccount, async (req, res) => {
  try {
    const { productId } = req.params;
    const { cost, price } = req.body;

    // IMPORTANT: This only updates the LOCAL database
    // Amazon data is NEVER modified - this is read-only for Amazon
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        cost: cost !== undefined ? parseFloat(cost) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
      },
    });

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Profit analytics routes
router.get('/analytics/profit/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const financeService = new FinanceService(accountId);
    const profit = await financeService.calculateProfit(accountId, {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });

    res.json(profit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/profit-by-product/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const financeService = new FinanceService(accountId);
    const profitByProduct = await financeService.getProfitByProduct(accountId, {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });

    res.json(profitByProduct);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Inventory routes
router.get('/inventory/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;

    const inventoryService = new InventoryService(accountId);
    const inventory = await inventoryService.getInventory(accountId);

    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/inventory/:accountId/alerts', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;

    const inventoryService = new InventoryService(accountId);

    try {
      // Try to use Amazon's official restock recommendations
      console.log('📊 Attempting to fetch Amazon restock recommendations...');
      const recommendations = await inventoryService.syncRestockRecommendations(accountId);

      // Transform Amazon's data to match frontend expectations
      const alerts = await Promise.all(recommendations.map(async (rec) => {
        // Find product by ASIN
        const product = await prisma.product.findFirst({
          where: {
            accountId,
            asin: rec.asin,
          },
        });

        // Calculate severity based on recommended order quantity
        let severity = 'low';
        if (rec.recommendedOrderQty > 50) {
          severity = 'high';
        } else if (rec.recommendedOrderQty > 20) {
          severity = 'medium';
        }

        // Calculate days until out of stock
        const avgDailySales = rec.last30DaysUnits / 30;
        const daysUntilOutOfStock = avgDailySales > 0
          ? Math.floor(rec.availableQty / avgDailySales)
          : 999;

        return {
          asin: rec.asin,
          product: product || {
            title: rec.productName,
            asin: rec.asin,
            sku: rec.sku,
          },
          currentStock: rec.availableQty,
          inboundQty: 0, // Not provided by Amazon report
          avgDailySales: Math.round(avgDailySales * 100) / 100,
          sales30d: rec.last30DaysUnits,
          daysUntilOutOfStock,
          severity,
          recommendedOrderQty: rec.recommendedOrderQty,
          restockDate: rec.restockDate,
        };
      }));

      // Sort by severity (high first) then by days until out of stock
      const sortedAlerts = alerts.sort((a, b) => {
        if (a.severity === 'high' && b.severity !== 'high') return -1;
        if (a.severity !== 'high' && b.severity === 'high') return 1;
        if (a.severity === 'medium' && b.severity === 'low') return -1;
        if (a.severity === 'low' && b.severity === 'medium') return 1;
        return a.daysUntilOutOfStock - b.daysUntilOutOfStock;
      });

      console.log(`✅ Successfully fetched ${sortedAlerts.length} Amazon restock recommendations`);
      res.json(sortedAlerts);
    } catch (amazonError: any) {
      // Fallback to custom calculation if Amazon report fails
      console.warn('⚠️  Amazon restock report failed, falling back to custom alerts:', amazonError.message);

      const alerts = await inventoryService.getInventoryAlerts(accountId);
      res.json(alerts);
    }
  } catch (error: any) {
    console.error('Error fetching inventory alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync routes
router.post('/sync/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { type, sellingPartnerId, dateRange, useQueue = true } = req.body;

    // Use async queues (recommended for large syncs)
    if (useQueue) {
      let job;

      if (type === 'orders') {
        job = await ordersQueue.add({ accountId, sellingPartnerId });
      } else if (type === 'finances') {
        job = await financesQueue.add({ accountId, sellingPartnerId, dateRange });
      } else if (type === 'inventory') {
        job = await inventoryQueue.add({ accountId, sellingPartnerId });
      } else {
        // Sync all - queue each separately
        const jobs = await Promise.all([
          ordersQueue.add({ accountId, sellingPartnerId }),
          financesQueue.add({ accountId, sellingPartnerId }),
          inventoryQueue.add({ accountId, sellingPartnerId }),
        ]);
        return res.json({
          success: true,
          message: 'Sync jobs queued',
          jobIds: jobs.map(j => j.id)
        });
      }

      return res.json({
        success: true,
        message: 'Sync job queued',
        jobId: job.id
      });
    }

    // Fallback: Direct sync (only for small/testing - may timeout!)
    let result;

    if (type === 'orders') {
      result = await directSync.syncOrders(accountId, sellingPartnerId);
    } else if (type === 'finances') {
      if (dateRange && dateRange.from && dateRange.to) {
        console.log(`🗓️  Syncing finances with custom date range: ${dateRange.from} to ${dateRange.to}`);
        const financeService = new FinanceService(accountId, sellingPartnerId);
        result = await financeService.syncFinancialEvents(accountId, 730, sellingPartnerId, dateRange);
      } else {
        result = await directSync.syncFinances(accountId, sellingPartnerId);
      }
    } else if (type === 'inventory') {
      result = await directSync.syncInventory(accountId, sellingPartnerId);
    } else if (type === 'analytics') {
      console.log(`📊 Syncing analytics data...`);
      result = await directSync.syncAnalytics(accountId, 90, sellingPartnerId);
    } else {
      result = await directSync.syncAll(accountId, sellingPartnerId);
    }

    res.json({ success: true, message: 'Sync completed', result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sync/status/:accountId', authorizeAccount, async (req, res) => {
  try {
    const jobs = await prisma.syncJob.findMany({
      where: { accountId: req.params.accountId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get queue job status
router.get('/sync/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Try to find job in all queues
    let job = await ordersQueue.getJob(jobId);
    if (!job) job = await financesQueue.getJob(jobId);
    if (!job) job = await inventoryQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();

    res.json({
      jobId: job.id,
      state,
      progress,
      data: job.data,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cost Breakdown routes
router.get('/analytics/cost-breakdown/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate, marketplaceIds, skus } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const financeService = new FinanceService(accountId);
    const breakdown = await financeService.getCostBreakdown(accountId, {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      marketplaceIds: marketplaceIds ? (marketplaceIds as string).split(',') : undefined,
      skus: skus ? (skus as string).split(',') : undefined,
    });

    res.json(breakdown);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Marketplace Stats routes
router.get('/analytics/marketplace-stats/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const financeService = new FinanceService(accountId);
    const stats = await financeService.getMarketplaceStats(accountId, {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Marketplaces available for account
router.get('/marketplaces/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Get distinct marketplaces from orders and products
    const marketplaces = await prisma.$queryRaw<Array<{ marketplaceId: string }>>`
      SELECT DISTINCT marketplaceId
      FROM (
        SELECT marketplaceId FROM \`Order\` WHERE accountId = ${accountId}
        UNION
        SELECT marketplaceId FROM Product WHERE accountId = ${accountId} AND marketplaceId IS NOT NULL
      ) AS mp
      WHERE marketplaceId IS NOT NULL
    `;

    // Marketplace name mapping
    const marketplaceNames: Record<string, string> = {
      'ATVPDKIKX0DER': 'Stati Uniti',
      'A2EUQ1WTGCTBG2': 'Canada',
      'A1AM78C64UM0Y8': 'Messico',
      'A2Q3Y263D00KWC': 'Brasile',
      'A1F83G8C2ARO7P': 'Regno Unito',
      'A1PA6795UKMFR9': 'Germania',
      'A13V1IB3VIYZZH': 'Francia',
      'APJ6JRA9NG5V4': 'Italia',
      'A1RKKUPIHCS9HS': 'Spagna',
      'A1805IZSGTT6HS': 'Paesi Bassi',
      'A1VC38T7YXB528': 'Giappone',
      'A39IBJ37TRP1C6': 'Australia',
      'A19VAU5U5O7RUS': 'Singapore',
    };

    // Filter out unmapped marketplaces and map to Italian names
    res.json(
      marketplaces
        .filter((m: any) => marketplaceNames[m.marketplaceId]) // Only include mapped marketplaces
        .map((m: any) => ({
          marketplaceId: m.marketplaceId,
          name: marketplaceNames[m.marketplaceId],
        }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get financial event ID for an order
router.get('/orders/:accountId/:orderId/financial-event-id', authorizeAccount, async (req, res) => {
  try {
    const { accountId, orderId } = req.params;

    // Find the financial event for this order
    const financialEvent = await prisma.financialEvent.findFirst({
      where: {
        accountId,
        amazonOrderId: orderId,
        eventType: 'OrderRevenue',
        financialEventId: {
          not: null,
        },
      },
      select: {
        financialEventId: true,
      },
    });

    if (!financialEvent || !financialEvent.financialEventId) {
      return res.status(404).json({ error: 'Financial event ID not found for this order' });
    }

    res.json({ financialEventId: financialEvent.financialEventId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed balance calculation for an order
router.get('/orders/:accountId/:orderId/balance', authorizeAccount, async (req, res) => {
  try {
    const { accountId, orderId } = req.params;

    // Get order details
    const order = await prisma.order.findUnique({
      where: { amazonOrderId: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get all financial events for this order
    const events = await prisma.financialEvent.findMany({
      where: {
        accountId,
        amazonOrderId: orderId
      },
      orderBy: { postedDate: 'asc' },
    });

    // Initialize variables
    let isEstimated = false;
    let totalRevenue = 0;
    let totalFees = 0;
    let totalRefunds = 0;
    let revenue: any[] = [];
    let fees: any[] = [];
    let refunds: any[] = [];
    let feesByCategory: Record<string, any[]> = {};

    if (events.length === 0) {
      // No financial events found - return empty data without estimates
      // All values remain at 0 and arrays remain empty
    } else {
      // Use actual financial events
      revenue = events.filter((e: any) => e.eventType === 'OrderRevenue');
      fees = events.filter((e: any) => e.eventType === 'Fee');
      refunds = events.filter((e: any) => e.eventType === 'Refund');

      // Calculate totals
      totalRevenue = revenue.reduce((sum, e) => sum + e.amount, 0);
      totalFees = fees.reduce((sum, e) => sum + e.amount, 0);
      totalRefunds = refunds.reduce((sum, e) => sum + e.amount, 0);

      // Group fees by category
      fees.forEach(e => {
        const category = e.feeCategory || 'other';
        if (!feesByCategory[category]) {
          feesByCategory[category] = [];
        }
        feesByCategory[category].push({
          description: e.description,
          amount: e.amount,
          feeType: e.feeType,
        });
      });
    }

    const netBalance = totalRevenue + totalFees + totalRefunds;

    res.json({
      order: {
        amazonOrderId: order.amazonOrderId,
        purchaseDate: order.purchaseDate,
        orderStatus: order.orderStatus,
        totalAmount: order.totalAmount,
        currency: order.currency,
        numberOfItems: order.numberOfItems,
      },
      revenue: {
        items: revenue.map(e => ({
          description: e.description,
          amount: e.amount,
          sku: e.sku,
        })),
        total: totalRevenue,
      },
      fees: {
        byCategory: Object.entries(feesByCategory).map(([category, items]) => ({
          category,
          items,
          total: items.reduce((sum, i) => sum + i.amount, 0),
        })),
        total: totalFees,
      },
      refunds: {
        items: refunds.map(e => ({
          description: e.description,
          amount: e.amount,
        })),
        total: totalRefunds,
      },
      balance: {
        gross: totalRevenue,
        fees: totalFees,
        refunds: totalRefunds,
        net: netBalance,
      },
      hasEvents: events.length > 0,
      isEstimated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sales & Traffic Analytics routes
router.get('/analytics/:accountId/sales-traffic', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate, aggregation, sku, marketplaceId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const AnalyticsService = (await import('../services/analytics.service')).AnalyticsService;
    const analyticsService = new AnalyticsService(accountId);

    const metrics = await analyticsService.getMetrics(
      accountId,
      new Date(startDate as string),
      new Date(endDate as string),
      (aggregation as 'DAY' | 'WEEK' | 'MONTH') || 'DAY',
      sku as string,
      marketplaceId as string
    );

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/:accountId/performance-summary', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const AnalyticsService = (await import('../services/analytics.service')).AnalyticsService;
    const analyticsService = new AnalyticsService(accountId);

    const summary = await analyticsService.getPerformanceSummary(
      accountId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available products (SKUs) for filters
router.get('/analytics/:accountId/products', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Get distinct SKUs with their ASIN and product info
    const products = await prisma.salesTrafficMetric.findMany({
      where: {
        accountId,
        sku: { not: '' }, // Only non-empty SKUs
        childAsin: { not: '' },
      },
      distinct: ['sku'],
      select: {
        sku: true,
        childAsin: true,
        parentAsin: true,
      },
      orderBy: {
        sku: 'asc',
      },
    });

    // Get product titles from Product table
    const asins = products.map((p: any) => p.childAsin).filter(Boolean);
    const productDetails = await prisma.product.findMany({
      where: {
        accountId,
        asin: { in: asins as string[] },
      },
      select: {
        asin: true,
        title: true,
      },
    });

    const titleMap = new Map(productDetails.map((p: any) => [p.asin, p.title]));

    const result = products
      .filter((p: any) => p.sku && p.sku.trim() !== '') // Ensure SKU is not empty
      .map((p: any) => ({
        sku: p.sku!,
        asin: p.childAsin,
        title: titleMap.get(p.childAsin!) || p.childAsin,
        parentAsin: p.parentAsin,
      }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available marketplaces with data
router.get('/analytics/:accountId/marketplaces', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;

    // EU Marketplaces available for filtering
    const euMarketplaces = [
      { id: 'A1F83G8C2ARO7P', name: 'Regno Unito' },
      { id: 'A1PA6795UKMFR9', name: 'Germania' },
      { id: 'A13V1IB3VIYZZH', name: 'Francia' },
      { id: 'APJ6JRA9NG5V4', name: 'Italia' },
      { id: 'A1RKKUPIHCS9HS', name: 'Spagna' },
      { id: 'A1805IZSGTT6HS', name: 'Paesi Bassi' },
    ];

    // Get record counts for each marketplace
    const marketplaceData = await prisma.salesTrafficMetric.groupBy({
      by: ['marketplaceId'],
      where: {
        accountId,
        marketplaceId: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // Create a map of marketplace IDs to record counts
    const recordCountMap = new Map(
      marketplaceData.map((m: any) => [m.marketplaceId!, m._count.id])
    );

    // Return all EU marketplaces with record counts
    const result = euMarketplaces.map((m: any) => ({
      marketplaceId: m.id,
      name: m.name,
      recordCount: recordCountMap.get(m.id) || 0,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Buy Box Monitor - Get products with Buy Box percentage
router.get('/buy-box/:accountId', authorizeAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { marketplaceId, sortBy } = req.query;

    const where: any = {
      accountId,
      childAsin: { not: '' },
    };

    if (marketplaceId) {
      where.marketplaceId = marketplaceId as string;
    }

    // Get latest Buy Box data for each product
    const buyBoxData = await prisma.salesTrafficMetric.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      distinct: ['childAsin'],
      select: {
        childAsin: true,
        marketplaceId: true,
        buyBoxPercentage: true,
        date: true,
        orderedProductSales: true,
        unitsOrdered: true,
        pageViews: true,
        sessions: true,
      },
    });

    // Get product titles
    const asins = buyBoxData.map((d: any) => d.childAsin).filter(Boolean);
    const products = await prisma.product.findMany({
      where: {
        accountId,
        asin: { in: asins as string[] },
      },
      select: {
        asin: true,
        title: true,
      },
    });

    const titleMap = new Map(products.map((p: any) => [p.asin, p.title]));

    // Calculate average Buy Box over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalData = await prisma.salesTrafficMetric.groupBy({
      by: ['childAsin'],
      where: {
        accountId,
        childAsin: { in: asins as string[] },
        date: { gte: thirtyDaysAgo },
      },
      _avg: {
        buyBoxPercentage: true,
      },
    });

    const avgMap = new Map(historicalData.map((h: any) => [h.childAsin, h._avg.buyBoxPercentage || 0]));

    const result = buyBoxData.map((d: any) => {
      const currentBuyBox = d.buyBoxPercentage;
      const averageBuyBox = avgMap.get(d.childAsin!) || currentBuyBox;
      const trend = currentBuyBox > averageBuyBox + 2 ? 'up' :
        currentBuyBox < averageBuyBox - 2 ? 'down' : 'stable';

      return {
        asin: d.childAsin,
        title: titleMap.get(d.childAsin!) || d.childAsin,
        marketplaceId: d.marketplaceId,
        currentBuyBox: currentBuyBox,
        averageBuyBox: averageBuyBox,
        trend,
        lastChecked: d.date,
        sales: d.orderedProductSales,
        units: d.unitsOrdered,
        pageViews: d.pageViews,
        sessions: d.sessions,
      };
    });

    // Sort by Buy Box percentage (lowest first by default)
    const sorted = result.sort((a, b) => {
      if (sortBy === 'buybox-desc') return b.currentBuyBox - a.currentBuyBox;
      if (sortBy === 'sales') return b.sales - a.sales;
      if (sortBy === 'product') return a.title.localeCompare(b.title);
      return a.currentBuyBox - b.currentBuyBox; // Default: lowest buy box first
    });

    res.json(sorted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
