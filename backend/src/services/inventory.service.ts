import { PrismaClient } from '@prisma/client';
import SPAPIService from './spapi.service';

const prisma = new PrismaClient();

interface RestockRecommendation {
  sku: string;
  asin: string;
  fnSku: string;
  productName: string;
  availableQty: number;
  recommendedOrderQty: number;
  last30DaysUnits: number;
  restockDate?: string;
}

export class InventoryService {
  private spapi: SPAPIService;
  private sellingPartnerId?: string;

  constructor(accountId: string, sellingPartnerId?: string) {
    this.sellingPartnerId = sellingPartnerId;
    this.spapi = new SPAPIService(accountId, sellingPartnerId);
  }

  async syncInventory(accountId: string, sellingPartnerId?: string) {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      const response = await this.spapi.getInventorySummaries({
        granularityType: 'Marketplace',
        granularityId: account.marketplaceId,
        marketplaceIds: [account.marketplaceId],
        details: true,
      });

      const inventories = response.inventorySummaries || [];

      for (const inv of inventories) {
        // Find or create product
        let product = await prisma.product.findFirst({
          where: {
            accountId,
            OR: [
              { sku: inv.sellerSku },
              { asin: inv.asin },
            ],
          },
        });

        if (!product) {
          // Truncate title to 191 characters (UTF8 indexed column limit)
          const title = (inv.productName || inv.sellerSku).substring(0, 191);

          product = await prisma.product.create({
            data: {
              accountId,
              asin: inv.asin || '',
              sku: inv.sellerSku,
              title,
            },
          });
        }

        // Update inventory
        const totalQuantity = inv.totalQuantity || 0;
        const fulfillableQty = inv.inventoryDetails?.fulfillableQuantity || totalQuantity;
        const inboundQty = inv.inventoryDetails?.inboundWorkingQuantity || 0;

        // Handle reservedQuantity - can be number or object
        const reserved = inv.inventoryDetails?.reservedQuantity;
        const reservedQty = typeof reserved === 'object'
          ? (reserved.totalReservedQuantity || 0)
          : (reserved || 0);

        // Handle unfulfillableQuantity - can be number or object
        const unfulfillable = inv.inventoryDetails?.unfulfillableQuantity;
        const unfulfillableQty = typeof unfulfillable === 'object'
          ? (unfulfillable.totalUnfulfillableQuantity || 0)
          : (unfulfillable || 0);

        await prisma.inventory.upsert({
          where: {
            accountId_sku_marketplaceId: {
              accountId,
              sku: inv.sellerSku,
              marketplaceId: account.marketplaceId,
            },
          },
          update: {
            fnSku: inv.fnSku,
            fulfillableQty,
            inboundQty,
            reservedQty,
            unfulfillableQty,
            lastUpdated: new Date(),
          },
          create: {
            accountId,
            productId: product.id,
            marketplaceId: account.marketplaceId,
            sku: inv.sellerSku,
            fnSku: inv.fnSku,
            fulfillableQty,
            inboundQty,
            reservedQty,
            unfulfillableQty,
          },
        });
      }

      return { success: true, inventoriesProcessed: inventories.length };
    } catch (error) {
      console.error('Error syncing inventory:', error);
      throw error;
    }
  }

  async getInventory(accountId: string) {
    return prisma.inventory.findMany({
      where: { accountId },
      include: {
        product: true,
      },
      orderBy: {
        lastUpdated: 'desc',
      },
    });
  }

  async getLowStockProducts(accountId: string, threshold: number = 10) {
    return prisma.inventory.findMany({
      where: {
        accountId,
        fulfillableQty: {
          lte: threshold,
        },
      },
      include: {
        product: true,
      },
    });
  }

  async syncRestockRecommendations(accountId: string): Promise<RestockRecommendation[]> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      console.log('📊 Requesting restock recommendations report from Amazon...');

      // Request the report
      const createReportResponse = await this.spapi.createReport({
        reportType: 'GET_RESTOCK_INVENTORY_RECOMMENDATIONS_REPORT',
        marketplaceIds: [account.marketplaceId],
      });

      const reportId = createReportResponse.reportId;
      console.log(`📄 Report requested: ${reportId}`);

      // Wait for report to be processed
      let reportReady = false;
      let reportDocumentId = null;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max

      while (!reportReady && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;

        const reportStatus = await this.spapi.getReport(reportId);
        console.log(`⏳ Report status: ${reportStatus.processingStatus} (attempt ${attempts}/${maxAttempts})`);

        if (reportStatus.processingStatus === 'DONE') {
          reportReady = true;
          reportDocumentId = reportStatus.reportDocumentId;
        } else if (reportStatus.processingStatus === 'FATAL' || reportStatus.processingStatus === 'CANCELLED') {
          throw new Error(`Report failed: ${reportStatus.processingStatus}`);
        }
      }

      if (!reportDocumentId) {
        throw new Error('Report not ready after maximum wait time');
      }

      console.log(`📥 Downloading report document: ${reportDocumentId}`);

      // Get document info and download
      const documentInfo = await this.spapi.getReportDocument(reportDocumentId);
      const documentContent = await this.spapi.downloadReportDocument(documentInfo.url);

      // Parse TSV content
      const lines = documentContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split('\t');

      const recommendations: RestockRecommendation[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Map to our interface (column names may vary)
        recommendations.push({
          sku: row['Seller SKU'] || row['seller-sku'] || '',
          asin: row['ASIN'] || row['asin'] || '',
          fnSku: row['FN SKU'] || row['fnsku'] || '',
          productName: row['Product Name'] || row['product-name'] || '',
          availableQty: parseInt(row['Available'] || row['available'] || '0'),
          recommendedOrderQty: parseInt(row['Recommended replenishment qty'] || row['recommended-order-quantity'] || '0'),
          last30DaysUnits: parseInt(row['Units Sold Last 30 Days'] || row['units-sold-last-30-days'] || '0'),
          restockDate: row['Recommended ship date'] || row['recommended-ship-date'] || undefined,
        });
      }

      console.log(`✅ Parsed ${recommendations.length} restock recommendations`);
      return recommendations.filter(r => r.recommendedOrderQty > 0); // Only return items that need restocking

    } catch (error: any) {
      console.error('Error syncing restock recommendations:', error);
      throw error;
    }
  }

  async getInventoryAlerts(accountId: string) {
    // Get all inventory items
    const allInventory = await prisma.inventory.findMany({
      where: { accountId },
      include: {
        product: true,
      },
    });

    // Group inventory by ASIN
    const inventoryByAsin = allInventory.reduce((acc, inv) => {
      const asin = inv.product.asin;
      if (!asin) return acc;

      if (!acc[asin]) {
        acc[asin] = {
          asin,
          product: inv.product, // Keep first product for title
          totalStock: 0,
          totalInbound: 0,
          productIds: [],
        };
      }

      acc[asin].totalStock += inv.fulfillableQty;
      acc[asin].totalInbound += inv.inboundQty;
      acc[asin].productIds.push(inv.productId);

      return acc;
    }, {} as Record<string, any>);

    // Calculate alerts for each ASIN
    const alerts = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const asinData of Object.values(inventoryByAsin)) {
      // Skip if stock is not low (threshold: 10)
      if (asinData.totalStock > 10) continue;

      // Get sales for all SKUs with this ASIN (last 30 days)
      const orderItems = await prisma.orderItem.findMany({
        where: {
          productId: { in: asinData.productIds },
          order: {
            accountId,
            purchaseDate: {
              gte: thirtyDaysAgo,
            },
            orderStatus: {
              not: 'Canceled',
            },
          },
        },
      });

      const totalQuantitySold = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const avgDailySales = totalQuantitySold / 30;

      const daysUntilOutOfStock = avgDailySales > 0
        ? Math.floor(asinData.totalStock / avgDailySales)
        : 999;

      alerts.push({
        asin: asinData.asin,
        product: asinData.product,
        currentStock: asinData.totalStock,
        inboundQty: asinData.totalInbound,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        sales30d: totalQuantitySold, // Total units sold in last 30 days
        daysUntilOutOfStock,
        severity: daysUntilOutOfStock <= 7 ? 'high' : daysUntilOutOfStock <= 14 ? 'medium' : 'low',
      });
    }

    return alerts.sort((a, b) => a.daysUntilOutOfStock - b.daysUntilOutOfStock);
  }
}

export default InventoryService;
