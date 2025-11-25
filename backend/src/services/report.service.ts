import { PrismaClient } from '@prisma/client';
import SPAPIService from './spapi.service';
import { subDays } from 'date-fns';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

/**
 * ReportService - Handle Amazon Reports API for bulk data sync
 *
 * Uses Reports API to download orders with items in bulk,
 * avoiding slow getOrderItems calls (1 every 3 min rate limit)
 */
export class ReportService {
  private spapi: SPAPIService;
  private accountId: string;

  constructor(accountId: string, sellingPartnerId?: string) {
    this.accountId = accountId;
    this.spapi = new SPAPIService(accountId, sellingPartnerId);
  }

  /**
   * Sync orders using Reports API (much faster than Orders API)
   *
   * Flow:
   * 1. Request report (GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL)
   * 2. Poll until ready (usually 2-5 minutes)
   * 3. Download CSV
   * 4. Parse and save orders + items
   */
  async syncOrdersViaReport(accountId: string, daysBack = 730, sellingPartnerId?: string) {
    console.log(`\n📊 Starting Orders sync via Reports API (${daysBack} days)...`);

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Amazon Reports API limits date range to 30 days per report
    const CHUNK_SIZE_DAYS = 30;
    const needsChunking = daysBack > CHUNK_SIZE_DAYS;

    // Use all EU marketplaces
    const marketplaceIds = [
      'A1F83G8C2ARO7P', // UK
      'A1PA6795UKMFR9', // Germany
      'A13V1IB3VIYZZH', // France
      'APJ6JRA9NG5V4',  // Italy
      'A1RKKUPIHCS9HS', // Spain
      'A1805IZSGTT6HS', // Netherlands
    ];

    let totalOrders = 0;
    let totalItems = 0;

    if (needsChunking) {
      const now = new Date();
      const chunks: Array<{ start: Date; end: Date; }> = [];

      // Calculate date chunks (30 days max each)
      for (let i = 0; i < daysBack; i += CHUNK_SIZE_DAYS) {
        const chunkEnd = subDays(now, i);
        const chunkStart = subDays(now, Math.min(i + CHUNK_SIZE_DAYS, daysBack));
        chunks.push({ start: chunkStart, end: chunkEnd });
      }

      console.log(`📅 Date range: ${subDays(now, daysBack).toISOString().split('T')[0]} → ${now.toISOString().split('T')[0]}`);
      console.log(`🌍 Marketplaces: ${marketplaceIds.length} EU marketplaces`);
      console.log(`📦 Chunks: ${chunks.length} (max ${CHUNK_SIZE_DAYS} days each)\n`);

      // Process each chunk
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        console.log(`\n📦 Chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.start.toISOString().split('T')[0]} to ${chunk.end.toISOString().split('T')[0]}`);

        try {
          // Step 1: Request report for this chunk
          console.log('   📄 Requesting report...');
          const createResponse = await this.spapi.createReport({
            reportType: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL',
            marketplaceIds,
            dataStartTime: chunk.start.toISOString(),
            dataEndTime: chunk.end.toISOString(),
          });

          const reportId = createResponse.reportId;
          console.log(`   ✅ Report requested: ${reportId}`);

          // Step 2: Poll until ready
          console.log('   ⏳ Waiting for report generation...');
          const reportDocument = await this.pollReportStatus(reportId);

          if (!reportDocument) {
            console.error('   ❌ Report generation failed');
            continue;
          }

          // Step 3: Download report
          console.log('   📥 Downloading report...');
          const reportData = await this.downloadReport(reportDocument);

          // Step 4: Parse CSV and save to database
          console.log('   🔄 Parsing and saving orders...');
          const result = await this.parseAndSaveOrders(reportData, accountId);

          totalOrders += result.ordersProcessed;
          totalItems += result.itemsProcessed;

          console.log(`   ✅ Chunk complete: ${result.ordersProcessed} orders, ${result.itemsProcessed} items`);

        } catch (error: any) {
          console.error(`   ❌ Chunk ${chunkIndex + 1} failed:`, error.message);
          // Continue with next chunk
        }
      }

    } else {
      // Single report for small date ranges
      const endDate = new Date();
      const startDate = subDays(endDate, daysBack);

      console.log(`📅 Date range: ${startDate.toISOString()} → ${endDate.toISOString()}`);
      console.log(`🌍 Marketplaces: ${marketplaceIds.length} EU marketplaces\n`);

      // Step 1: Request report
      console.log('📄 Requesting report from Amazon...');
      const createResponse = await this.spapi.createReport({
        reportType: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL',
        marketplaceIds,
        dataStartTime: startDate.toISOString(),
        dataEndTime: endDate.toISOString(),
      });

      const reportId = createResponse.reportId;
      console.log(`✅ Report requested: ${reportId}`);

      // Step 2: Poll until ready
      console.log('\n⏳ Waiting for report to be generated...');
      const reportDocument = await this.pollReportStatus(reportId);

      if (!reportDocument) {
        throw new Error('Report generation failed');
      }

      // Step 3: Download report
      console.log('\n📥 Downloading report...');
      const reportData = await this.downloadReport(reportDocument);

      // Step 4: Parse CSV and save to database
      console.log('\n🔄 Parsing and saving orders...');
      const result = await this.parseAndSaveOrders(reportData, accountId);

      totalOrders = result.ordersProcessed;
      totalItems = result.itemsProcessed;
    }

    console.log('\n✅ Report sync completed!');
    console.log(`   Orders processed: ${totalOrders}`);
    console.log(`   Items processed: ${totalItems}`);

    return { ordersProcessed: totalOrders, itemsProcessed: totalItems };
  }

  /**
   * Poll report status until ready
   */
  private async pollReportStatus(reportId: string, maxAttempts = 60): Promise<any> {
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

    throw new Error('Report generation timeout (10 minutes)');
  }

  /**
   * Download report document
   */
  private async downloadReport(reportDocumentId: string): Promise<string> {
    const documentInfo = await this.spapi.getReportDocument(reportDocumentId);
    console.log(`📄 Document Info:`, {
      url: documentInfo?.url ? 'present' : 'MISSING',
      compressionAlgorithm: documentInfo?.compressionAlgorithm,
      keys: documentInfo ? Object.keys(documentInfo) : 'null'
    });
    const reportData = await this.spapi.downloadReportDocument(documentInfo);
    console.log(`✅ Downloaded ${reportData.length} bytes`);
    return reportData;
  }

  /**
   * Parse CSV and save orders + items to database
   */
  private async parseAndSaveOrders(csvData: string, accountId: string) {
    // Amazon reports are tab-delimited (TSV)
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      delimiter: '\t', // Tab-delimited!
    });

    console.log(`📊 Found ${records.length} order items in report`);

    // Log first row column names for debugging
    if (records.length > 0) {
      const firstRow = records[0] as any;
      console.log(`   Column names: ${Object.keys(firstRow).slice(0, 10).join(', ')}...`);
    }

    const orderMap = new Map<string, any>();
    let itemsProcessed = 0;

    for (const row of records as any[]) {
      try {
        const amazonOrderId = row['amazon-order-id'];
        if (!amazonOrderId) {
          console.error('   ⚠️  Row missing amazon-order-id, available keys:', Object.keys(row).slice(0, 5));
          continue;
        }

        // Group items by order
        if (!orderMap.has(amazonOrderId)) {
          // Create/update order
          const purchaseDate = row['purchase-date'];
          const orderStatus = row['order-status'] || 'Unknown';
          const marketplaceId = row['sales-channel']; // or extract from row

          const order = await prisma.order.upsert({
            where: { amazonOrderId },
            update: {
              orderStatus,
              updatedAt: new Date(),
            },
            create: {
              accountId,
              amazonOrderId,
              purchaseDate: new Date(purchaseDate),
              orderStatus,
              totalAmount: parseFloat(row['item-price'] || '0'),
              currency: row['currency'] || 'EUR',
              numberOfItems: 1,
              marketplaceId: marketplaceId || accountId, // fallback
              buyerEmail: null, // buyer-email not available in flat file reports without RDT
              shippingAddress: {},
            },
          });

          orderMap.set(amazonOrderId, order);
        }

        const order = orderMap.get(amazonOrderId);

        // Create/find product
        const sku = row['sku'];
        const asin = row['asin'];
        const title = row['product-name'];

        let product = await prisma.product.findFirst({
          where: { accountId, sku },
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              accountId,
              asin,
              sku,
              title,
              price: parseFloat(row['item-price'] || '0'),
            },
          });
        }

        // Create order item
        // Note: order-item-id is not included in flat file reports, generate unique ID
        const orderItemId = `${amazonOrderId}-${sku}-${itemsProcessed}`;

        await prisma.orderItem.upsert({
          where: { id: orderItemId },
          update: {
            quantity: parseInt(row['quantity'] || '1'),
            itemPrice: parseFloat(row['item-price'] || '0'),
            itemTax: parseFloat(row['item-tax'] || '0'),
            shippingPrice: parseFloat(row['shipping-price'] || '0'),
            shippingTax: parseFloat(row['shipping-tax'] || '0'),
            promotionDiscount: parseFloat(row['item-promotion-discount'] || '0'),
          },
          create: {
            id: orderItemId,
            orderId: order.id,
            productId: product.id,
            asin,
            sku,
            title,
            quantity: parseInt(row['quantity'] || '1'),
            itemPrice: parseFloat(row['item-price'] || '0'),
            itemTax: parseFloat(row['item-tax'] || '0'),
            shippingPrice: parseFloat(row['shipping-price'] || '0'),
            shippingTax: parseFloat(row['shipping-tax'] || '0'),
            promotionDiscount: parseFloat(row['item-promotion-discount'] || '0'),
          },
        });

        itemsProcessed++;

        if (itemsProcessed % 100 === 0) {
          console.log(`   Processed ${itemsProcessed}/${records.length} items...`);
        }

      } catch (error: any) {
        console.error(`Error processing row:`, error.message);
        // Continue with next row
      }
    }

    return {
      ordersProcessed: orderMap.size,
      itemsProcessed,
    };
  }
}

export default ReportService;
