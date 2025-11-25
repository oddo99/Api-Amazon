import { PrismaClient } from '@prisma/client';
import SPAPIService from './spapi.service';
import { subDays, format } from 'date-fns';

const prisma = new PrismaClient();

/**
 * AnalyticsService - Handle Sales & Traffic Analytics
 *
 * Uses Amazon's GET_SALES_AND_TRAFFIC_REPORT to retrieve:
 * - Page views, sessions, conversion rates
 * - Sales data by ASIN/SKU
 * - Buy Box percentage
 * - B2B metrics
 */
export class AnalyticsService {
  private spapi: SPAPIService;
  private accountId: string;

  constructor(accountId: string, sellingPartnerId?: string) {
    this.accountId = accountId;
    this.spapi = new SPAPIService(accountId, sellingPartnerId);
  }

  /**
   * Sync Sales & Traffic Report from Amazon
   *
   * Report structure (JSON):
   * {
   *   "salesAndTrafficByDate": [
   *     {
   *       "date": "2025-01-01",
   *       "salesByDate": { orderedProductSales: {...}, ... },
   *       "trafficByDate": { browserPageViews: 100, ... }
   *     }
   *   ],
   *   "salesAndTrafficByAsin": [
   *     {
   *       "parentAsin": "B001",
   *       "childAsin": "B001-RED",
   *       "sku": "SKU-001",
   *       "salesByAsin": { ... },
   *       "trafficByAsin": { ... }
   *     }
   *   ]
   * }
   */
  async syncSalesAndTrafficReport(
    accountId: string,
    daysBack: number = 90,
    sellingPartnerId?: string,
    aggregation: 'DAY' | 'WEEK' | 'MONTH' = 'DAY',
    targetMarketplaceId?: string
  ) {
    console.log(`\n📊 Starting Sales & Traffic sync (${daysBack} days, ${aggregation} aggregation)...`);

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Use specified marketplace or account's default marketplace
    const marketplaceId = targetMarketplaceId || account.marketplaceId;
    console.log(`🌍 Marketplace: ${marketplaceId}`);

    const endDate = new Date();
    const startDate = subDays(endDate, daysBack);

    console.log(`📅 Date range: ${format(startDate, 'yyyy-MM-dd')} → ${format(endDate, 'yyyy-MM-dd')}`);

    // Step 1: Request report
    console.log('📄 Requesting Sales & Traffic report from Amazon...');
    const createResponse = await this.spapi.createReport({
      reportType: 'GET_SALES_AND_TRAFFIC_REPORT',
      marketplaceIds: [marketplaceId],
      dataStartTime: startDate.toISOString(),
      dataEndTime: endDate.toISOString(),
      reportOptions: {
        dateGranularity: aggregation,
        asinGranularity: 'CHILD', // PARENT, CHILD, or SKU
      },
    });

    const reportId = createResponse.reportId;
    console.log(`✅ Report requested: ${reportId}`);

    // Step 2: Poll until ready
    console.log('\n⏳ Waiting for report to be generated...');
    const reportDocumentId = await this.pollReportStatus(reportId);

    if (!reportDocumentId) {
      throw new Error('Report generation failed');
    }

    // Step 3: Download report
    console.log('\n📥 Downloading report...');
    const reportData = await this.downloadReport(reportDocumentId);

    // Step 4: Parse JSON and save to database
    console.log('\n🔄 Parsing and saving metrics...');
    const result = await this.parseAndSaveMetrics(reportData, accountId, aggregation, daysBack, marketplaceId);

    console.log('\n✅ Sales & Traffic sync completed!');
    console.log(`   Metrics by date: ${result.metricsByDate}`);
    console.log(`   Metrics by ASIN: ${result.metricsByAsin}`);

    return result;
  }

  /**
   * Poll report status until ready
   */
  private async pollReportStatus(reportId: string, maxAttempts = 60): Promise<string | null> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const report = await this.spapi.getReport(reportId);

      console.log(`   Status: ${report.processingStatus} (attempt ${attempts + 1}/${maxAttempts})`);

      if (report.processingStatus === 'DONE') {
        console.log('✅ Report ready!');
        return report.reportDocumentId;
      }

      if (report.processingStatus === 'FATAL' || report.processingStatus === 'CANCELLED') {
        throw new Error(`Report generation failed: ${report.processingStatus}`);
      }

      // Wait 10 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }

    return null;
  }

  /**
   * Download report document
   */
  private async downloadReport(reportDocumentId: string): Promise<string> {
    const documentInfo = await this.spapi.getReportDocument(reportDocumentId);
    const reportData = await this.spapi.downloadReportDocument(documentInfo);
    console.log(`✅ Downloaded ${reportData.length} characters`);
    return reportData;
  }

  /**
   * Parse JSON report and save to database
   */
  private async parseAndSaveMetrics(jsonData: string, accountId: string, aggregationType: string, daysBack: number, marketplaceId: string) {
    const report = JSON.parse(jsonData);

    let metricsByDate = 0;
    let metricsByAsin = 0;

    // Process aggregate metrics by date
    if (report.salesAndTrafficByDate && Array.isArray(report.salesAndTrafficByDate)) {
      console.log(`📊 Processing ${report.salesAndTrafficByDate.length} date entries...`);

      for (const entry of report.salesAndTrafficByDate) {
        try {
          const date = new Date(entry.date);
          const sales = entry.salesByDate || {};
          const traffic = entry.trafficByDate || {};

          await prisma.salesTrafficMetric.upsert({
            where: {
              accountId_date_childAsin_aggregationType: {
                accountId,
                date,
                childAsin: '', // Aggregate data (no specific ASIN)
                aggregationType,
              },
            },
            update: {
              marketplaceId: marketplaceId,

              // Sales
              orderedProductSales: sales.orderedProductSales?.amount || 0,
              orderedProductSalesB2B: sales.orderedProductSalesB2B?.amount || 0,
              unitsOrdered: sales.unitsOrdered || 0,
              unitsOrderedB2B: sales.unitsOrderedB2B || 0,
              totalOrderItems: sales.totalOrderItems || 0,
              totalOrderItemsB2B: sales.totalOrderItemsB2B || 0,
              unitsRefunded: sales.unitsRefunded || 0,

              // Traffic
              browserPageViews: traffic.browserPageViews || 0,
              browserPageViewsB2B: traffic.browserPageViewsB2B || 0,
              mobileAppPageViews: traffic.mobileAppPageViews || 0,
              mobileAppPageViewsB2B: traffic.mobileAppPageViewsB2B || 0,
              pageViews: traffic.pageViews || 0,
              pageViewsB2B: traffic.pageViewsB2B || 0,
              browserSessions: traffic.browserSessions || 0,
              browserSessionsB2B: traffic.browserSessionsB2B || 0,
              mobileAppSessions: traffic.mobileAppSessions || 0,
              mobileAppSessionsB2B: traffic.mobileAppSessionsB2B || 0,
              sessions: traffic.sessions || 0,
              sessionsB2B: traffic.sessionsB2B || 0,

              // Performance
              buyBoxPercentage: traffic.buyBoxPercentage || 0,
              buyBoxPercentageB2B: traffic.buyBoxPercentageB2B || 0,
              unitSessionPercentage: traffic.unitSessionPercentage || 0,
              unitSessionPercentageB2B: traffic.unitSessionPercentageB2B || 0,

              updatedAt: new Date(),
            },
            create: {
              accountId,
              date,
              aggregationType,
              childAsin: '',
              parentAsin: null,
              sku: null,
              marketplaceId: marketplaceId,

              // Sales
              orderedProductSales: sales.orderedProductSales?.amount || 0,
              orderedProductSalesB2B: sales.orderedProductSalesB2B?.amount || 0,
              unitsOrdered: sales.unitsOrdered || 0,
              unitsOrderedB2B: sales.unitsOrderedB2B || 0,
              totalOrderItems: sales.totalOrderItems || 0,
              totalOrderItemsB2B: sales.totalOrderItemsB2B || 0,
              unitsRefunded: sales.unitsRefunded || 0,

              // Traffic
              browserPageViews: traffic.browserPageViews || 0,
              browserPageViewsB2B: traffic.browserPageViewsB2B || 0,
              mobileAppPageViews: traffic.mobileAppPageViews || 0,
              mobileAppPageViewsB2B: traffic.mobileAppPageViewsB2B || 0,
              pageViews: traffic.pageViews || 0,
              pageViewsB2B: traffic.pageViewsB2B || 0,
              browserSessions: traffic.browserSessions || 0,
              browserSessionsB2B: traffic.browserSessionsB2B || 0,
              mobileAppSessions: traffic.mobileAppSessions || 0,
              mobileAppSessionsB2B: traffic.mobileAppSessionsB2B || 0,
              sessions: traffic.sessions || 0,
              sessionsB2B: traffic.sessionsB2B || 0,

              // Performance
              buyBoxPercentage: traffic.buyBoxPercentage || 0,
              buyBoxPercentageB2B: traffic.buyBoxPercentageB2B || 0,
              unitSessionPercentage: traffic.unitSessionPercentage || 0,
              unitSessionPercentageB2B: traffic.unitSessionPercentageB2B || 0,
            },
          });

          metricsByDate++;
        } catch (error: any) {
          console.error(`Error processing date entry:`, error.message);
        }
      }
    }

    // Process metrics by ASIN
    if (report.salesAndTrafficByAsin && Array.isArray(report.salesAndTrafficByAsin)) {
      console.log(`📊 Processing ${report.salesAndTrafficByAsin.length} ASIN entries...`);

      for (const entry of report.salesAndTrafficByAsin) {
        try {
          const sales = entry.salesByAsin || {};
          const traffic = entry.trafficByAsin || {};

          // For ASIN-level data, we store it with the first date of the period
          const date = subDays(new Date(), daysBack);

          await prisma.salesTrafficMetric.upsert({
            where: {
              accountId_date_childAsin_aggregationType: {
                accountId,
                date,
                childAsin: entry.childAsin || entry.parentAsin,
                aggregationType,
              },
            },
            update: {
              marketplaceId: marketplaceId,
              parentAsin: entry.parentAsin,
              sku: entry.sku,

              // Sales
              orderedProductSales: sales.orderedProductSales?.amount || 0,
              orderedProductSalesB2B: sales.orderedProductSalesB2B?.amount || 0,
              unitsOrdered: sales.unitsOrdered || 0,
              unitsOrderedB2B: sales.unitsOrderedB2B || 0,
              totalOrderItems: sales.totalOrderItems || 0,
              totalOrderItemsB2B: sales.totalOrderItemsB2B || 0,
              unitsRefunded: sales.unitsRefunded || 0,

              // Traffic
              browserPageViews: traffic.browserPageViews || 0,
              browserPageViewsB2B: traffic.browserPageViewsB2B || 0,
              mobileAppPageViews: traffic.mobileAppPageViews || 0,
              mobileAppPageViewsB2B: traffic.mobileAppPageViewsB2B || 0,
              pageViews: traffic.pageViews || 0,
              pageViewsB2B: traffic.pageViewsB2B || 0,
              browserSessions: traffic.browserSessions || 0,
              browserSessionsB2B: traffic.browserSessionsB2B || 0,
              mobileAppSessions: traffic.mobileAppSessions || 0,
              mobileAppSessionsB2B: traffic.mobileAppSessionsB2B || 0,
              sessions: traffic.sessions || 0,
              sessionsB2B: traffic.sessionsB2B || 0,

              // Performance
              buyBoxPercentage: traffic.buyBoxPercentage || 0,
              buyBoxPercentageB2B: traffic.buyBoxPercentageB2B || 0,
              unitSessionPercentage: traffic.unitSessionPercentage || 0,
              unitSessionPercentageB2B: traffic.unitSessionPercentageB2B || 0,

              updatedAt: new Date(),
            },
            create: {
              accountId,
              date,
              aggregationType,
              parentAsin: entry.parentAsin,
              childAsin: entry.childAsin || entry.parentAsin,
              sku: entry.sku,
              marketplaceId: marketplaceId,

              // Sales
              orderedProductSales: sales.orderedProductSales?.amount || 0,
              orderedProductSalesB2B: sales.orderedProductSalesB2B?.amount || 0,
              unitsOrdered: sales.unitsOrdered || 0,
              unitsOrderedB2B: sales.unitsOrderedB2B || 0,
              totalOrderItems: sales.totalOrderItems || 0,
              totalOrderItemsB2B: sales.totalOrderItemsB2B || 0,
              unitsRefunded: sales.unitsRefunded || 0,

              // Traffic
              browserPageViews: traffic.browserPageViews || 0,
              browserPageViewsB2B: traffic.browserPageViewsB2B || 0,
              mobileAppPageViews: traffic.mobileAppPageViews || 0,
              mobileAppPageViewsB2B: traffic.mobileAppPageViewsB2B || 0,
              pageViews: traffic.pageViews || 0,
              pageViewsB2B: traffic.pageViewsB2B || 0,
              browserSessions: traffic.browserSessions || 0,
              browserSessionsB2B: traffic.browserSessionsB2B || 0,
              mobileAppSessions: traffic.mobileAppSessions || 0,
              mobileAppSessionsB2B: traffic.mobileAppSessionsB2B || 0,
              sessions: traffic.sessions || 0,
              sessionsB2B: traffic.sessionsB2B || 0,

              // Performance
              buyBoxPercentage: traffic.buyBoxPercentage || 0,
              buyBoxPercentageB2B: traffic.buyBoxPercentageB2B || 0,
              unitSessionPercentage: traffic.unitSessionPercentage || 0,
              unitSessionPercentageB2B: traffic.unitSessionPercentageB2B || 0,
            },
          });

          metricsByAsin++;
        } catch (error: any) {
          console.error(`Error processing ASIN entry:`, error.message);
        }
      }
    }

    return { metricsByDate, metricsByAsin };
  }

  /**
   * Get Sales & Traffic metrics for dashboard
   */
  async getMetrics(
    accountId: string,
    startDate: Date,
    endDate: Date,
    aggregationType: 'DAY' | 'WEEK' | 'MONTH' = 'DAY',
    skus?: string | string[],
    marketplaceIds?: string | string[]
  ) {
    const where: any = {
      accountId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      aggregationType,
    };

    // Parse SKUs (can be comma-separated string or array)
    let skuList: string[] = [];
    if (skus) {
      skuList = Array.isArray(skus) ? skus : skus.split(',').filter(s => s.trim());
    }

    // Parse Marketplace IDs (can be comma-separated string or array)
    let marketplaceList: string[] = [];
    if (marketplaceIds) {
      marketplaceList = Array.isArray(marketplaceIds) ? marketplaceIds : marketplaceIds.split(',').filter(m => m.trim());
    }

    if (skuList.length > 0) {
      // Filter by one or more SKUs
      where.sku = { in: skuList };
    } else {
      // Get aggregate data (no SKU specified)
      where.childAsin = '';
    }

    // Filter by one or more marketplaces if specified
    if (marketplaceList.length > 0) {
      where.marketplaceId = { in: marketplaceList };
    }

    const metrics = await prisma.salesTrafficMetric.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    return metrics;
  }

  /**
   * Get performance summary (KPIs)
   */
  async getPerformanceSummary(accountId: string, startDate: Date, endDate: Date) {
    const metrics = await this.getMetrics(accountId, startDate, endDate, 'DAY');

    if (metrics.length === 0) {
      return null;
    }

    // Aggregate totals
    const totals = metrics.reduce((acc, m) => ({
      sales: acc.sales + m.orderedProductSales,
      units: acc.units + m.unitsOrdered,
      sessions: acc.sessions + m.sessions,
      pageViews: acc.pageViews + m.pageViews,
      orders: acc.orders + m.totalOrderItems,
    }), { sales: 0, units: 0, sessions: 0, pageViews: 0, orders: 0 });

    // Calculate KPIs
    const conversionRate = totals.sessions > 0 ? (totals.orders / totals.sessions) * 100 : 0;
    const avgOrderValue = totals.orders > 0 ? totals.sales / totals.orders : 0;
    const avgBuyBox = metrics.reduce((sum, m) => sum + m.buyBoxPercentage, 0) / metrics.length;

    return {
      totalSales: totals.sales,
      totalUnits: totals.units,
      totalSessions: totals.sessions,
      totalPageViews: totals.pageViews,
      totalOrders: totals.orders,
      conversionRate,
      avgOrderValue,
      avgBuyBoxPercentage: avgBuyBox,
    };
  }
}

export default AnalyticsService;
