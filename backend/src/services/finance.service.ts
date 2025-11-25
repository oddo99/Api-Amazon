import { PrismaClient } from '@prisma/client';
import SPAPIService from './spapi.service';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

// Cache for fee category mappings
let feeCategoryCache: Map<string, { category: string; displayName: string }> | null = null;

async function loadFeeCategoryMappings() {
  if (feeCategoryCache) return feeCategoryCache;

  const mappings = await prisma.feeCategoryMapping.findMany();
  feeCategoryCache = new Map(
    mappings.map((m: any) => [m.feeType, { category: m.category, displayName: m.displayName }])
  );

  return feeCategoryCache;
}

function categorizeFee(feeType?: string): { category: string; displayName: string } {
  if (!feeType) return { category: 'other', displayName: 'Other Fee' };

  const mapping = feeCategoryCache?.get(feeType);
  return mapping || { category: 'other', displayName: feeType };
}

// Helper to check if financial event already exists
async function createFinancialEventIfNotExists(data: {
  accountId: string;
  marketplaceId?: string;
  eventType: string;
  postedDate: Date;
  amazonOrderId?: string;
  financialEventId?: string;
  sku?: string;
  description: string;
  amount: number;
  currency: string;
  feeType?: string;
  feeCategory?: string;
}) {
  // PRIMARY: Check by financialEventId if available (most reliable)
  // This is the true unique identifier from Amazon
  if (data.financialEventId) {
    const existing = await prisma.financialEvent.findFirst({
      where: {
        accountId: data.accountId,
        financialEventId: data.financialEventId,
      },
    });

    if (existing) {
      console.log(`  ⏭️  Skipped duplicate (financialEventId): ${data.financialEventId}`);
      return { created: false, event: existing };
    }
  }

  // SECONDARY: Fallback to composite key for events without financialEventId
  // Use tolerance ranges to handle timezone/rounding differences between APIs
  const existing = await prisma.financialEvent.findFirst({
    where: {
      accountId: data.accountId,
      eventType: data.eventType,
      amazonOrderId: data.amazonOrderId || null,
      sku: data.sku || null,
      feeType: data.feeType || null,
      // Use date range instead of exact match (to handle timezone/rounding differences)
      postedDate: {
        gte: new Date(data.postedDate.getTime() - 1000), // -1 second
        lte: new Date(data.postedDate.getTime() + 1000), // +1 second
      },
      // Use amount range for rounding tolerance (±1 cent)
      amount: {
        gte: data.amount - 0.01,
        lte: data.amount + 0.01,
      },
    },
  });

  if (existing) {
    console.log(`  ⏭️  Skipped duplicate (composite key): ${data.eventType} ${data.amazonOrderId} ${data.sku || 'N/A'} ${data.amount}`);
    return { created: false, event: existing };
  }

  const event = await prisma.financialEvent.create({ data });
  return { created: true, event };
}

export class FinanceService {
  private spapi: SPAPIService;
  private sellingPartnerId?: string;

  constructor(accountId: string, sellingPartnerId?: string) {
    this.sellingPartnerId = sellingPartnerId;
    this.spapi = new SPAPIService(accountId, sellingPartnerId);
  }

  /**
   * @deprecated Use syncAllTransactions() instead to avoid duplicate fee processing.
   * 
   * This method uses the old Financial Events API which can create duplicate records
   * when used alongside the Transactions API (v2024-06-19).
   * 
   * The Transactions API is more complete and handles DEFERRED transactions properly.
   */
  async syncFinancialEvents(accountId: string, daysBack: number = 730, sellingPartnerId?: string, dateRange?: { from: string, to: string }) {
    console.warn('⚠️  WARNING: syncFinancialEvents is DEPRECATED. Use syncAllTransactions() instead to avoid duplicate fees.');
    console.warn('⚠️  This method will be removed in a future version.');

    throw new Error('syncFinancialEvents is deprecated. Use syncAllTransactions() instead.');

    /* DEPRECATED CODE - DO NOT USE
    try {
      // Load fee category mappings
      await loadFeeCategoryMappings();
    
      // Get account for marketplace info
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      const marketplaceId = account?.marketplaceId;
    
      let totalProcessed = 0;
    
      // If specific date range is provided, use it directly
      if (dateRange) {
        console.log(`📅 Using date range: ${dateRange.from.split('T')[0]} to ${dateRange.to.split('T')[0]}`);
        totalProcessed = await this.syncFinancialEventsRange(accountId, marketplaceId, dateRange.from, dateRange.to);
      } else {
        // Sync in 30-day chunks to avoid TTL expiration
        const chunkSizeDays = 30;
        // Limit to Amazon's retention period (730 days max, but use 729 for safety margin)
        const maxRetentionDays = 729;
        const totalDays = Math.min(daysBack, maxRetentionDays);
        // Set end date to start of today to avoid "date in future" error
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0);
    
        console.log(`📅 Syncing ${totalDays} days in ${chunkSizeDays}-day chunks to avoid TTL expiration`);
    
        for (let dayOffset = 0; dayOffset < totalDays; dayOffset += chunkSizeDays) {
          const chunkEnd = subDays(endDate, dayOffset);
          const chunkStart = subDays(endDate, Math.min(dayOffset + chunkSizeDays, totalDays));
    
          console.log(`\n📦 Chunk ${Math.floor(dayOffset / chunkSizeDays) + 1}: ${chunkStart.toISOString().split('T')[0]} to ${chunkEnd.toISOString().split('T')[0]}`);
    
          const processed = await this.syncFinancialEventsRange(
            accountId,
            marketplaceId,
            chunkStart.toISOString(),
            chunkEnd.toISOString()
          );
    
          totalProcessed += processed;
    
          if (processed === 0) {
            console.log(`✅ No more events found, stopping sync`);
            break;
          }
          }
        }
    
        console.log(`\n✅ Total sync completed: ${totalProcessed} financial events processed`);
        return { success: true, eventsProcessed: totalProcessed };
      } catch (error) {
        console.error('Error syncing financial events:', error);
        throw error;
      }
      */
  }

  private async syncFinancialEventsRange(accountId: string, marketplaceId: string | undefined, postedAfter: string, postedBefore: string) {
    let totalProcessed = 0;
    let nextToken: string | undefined = undefined;
    let pageCount = 0;

    // Loop through all pages for this date range
    do {
      pageCount++;
      console.log(`  📄 Page ${pageCount}...`);

      const requestParams: any = {
        PostedAfter: postedAfter,
        PostedBefore: postedBefore,
        MaxResultsPerPage: 100,
        NextToken: nextToken,
      };

      const response = await this.spapi.listFinancialEvents(requestParams);
      const events = response.FinancialEvents || {};
      nextToken = response.NextToken;

      // Process ShipmentEvents (order revenue)
      if (events.ShipmentEventList) {
        for (const shipment of events.ShipmentEventList) {
          const amazonOrderId = shipment.AmazonOrderId;
          const postedDate = new Date(shipment.PostedDate);
          // Use ShipmentId as the financial event identifier
          const financialEventId = shipment.ShipmentId || shipment.SellerOrderId || undefined;

          // Find the actual marketplace for this order
          const order = await prisma.order.findUnique({
            where: { amazonOrderId },
            select: { marketplaceId: true },
          });
          const eventMarketplaceId = order?.marketplaceId || marketplaceId;

          // Revenue from items
          for (const item of shipment.ShipmentItemList || []) {
            // Calculate revenue from ItemChargeList (Principal + Shipping + Tax)
            // Tax must be included because it's part of what the customer paid
            let revenue = 0;
            let currency = 'USD';

            for (const charge of item.ItemChargeList || []) {
              if (charge.ChargeType === 'Principal' ||
                charge.ChargeType === 'ShippingCharge' ||
                charge.ChargeType === 'Tax' ||
                charge.ChargeType === 'ShippingTax') {
                revenue += parseFloat(charge.ChargeAmount?.CurrencyAmount || 0);
                currency = charge.ChargeAmount?.CurrencyCode || currency;
              }
            }

            await createFinancialEventIfNotExists({
              accountId,
              marketplaceId: eventMarketplaceId,
              eventType: 'OrderRevenue',
              postedDate,
              amazonOrderId,
              financialEventId,
              sku: item.SellerSKU,
              description: `Revenue for ${item.SellerSKU}`,
              amount: revenue,
              currency,
            });

            // Fees
            for (const fee of item.ItemFeeList || []) {
              const { category, displayName } = categorizeFee(fee.FeeType);

              await createFinancialEventIfNotExists({
                accountId,
                marketplaceId: eventMarketplaceId,
                eventType: 'Fee',
                postedDate,
                amazonOrderId,
                financialEventId,
                sku: item.SellerSKU,
                description: displayName,
                amount: parseFloat(fee.FeeAmount?.CurrencyAmount || 0),
                currency: fee.FeeAmount?.CurrencyCode || 'USD',
                feeType: fee.FeeType,
                feeCategory: category,
              });
            }

            totalProcessed++;
          }
        }
      }

      // Process RefundEvents
      if (events.RefundEventList) {
        for (const refund of events.RefundEventList) {
          const amazonOrderId = refund.AmazonOrderId;
          const postedDate = new Date(refund.PostedDate);

          // Find the actual marketplace for this order
          const order = await prisma.order.findUnique({
            where: { amazonOrderId },
            select: { marketplaceId: true },
          });
          const eventMarketplaceId = order?.marketplaceId || marketplaceId;

          for (const item of refund.ShipmentItemList || []) {
            // Calculate refund amount from ItemChargeList (Principal + Shipping + Tax)
            let refundAmount = 0;
            let currency = 'USD';

            for (const charge of item.ItemChargeList || []) {
              if (charge.ChargeType === 'Principal' ||
                charge.ChargeType === 'ShippingCharge' ||
                charge.ChargeType === 'Tax' ||
                charge.ChargeType === 'ShippingTax') {
                refundAmount += parseFloat(charge.ChargeAmount?.CurrencyAmount || 0);
                currency = charge.ChargeAmount?.CurrencyCode || currency;
              }
            }

            await createFinancialEventIfNotExists({
              accountId,
              marketplaceId: eventMarketplaceId,
              eventType: 'Refund',
              postedDate,
              amazonOrderId,
              sku: item.SellerSKU,
              description: `Refund for ${item.SellerSKU}`,
              amount: -refundAmount,
              currency,
            });

            totalProcessed++;
          }
        }
      }

      // Process ServiceFeeEvents (subscription fees, etc.)
      if (events.ServiceFeeEventList) {
        for (const serviceFee of events.ServiceFeeEventList) {
          // Skip if no valid date
          if (!serviceFee.PostedDate) continue;

          const postedDate = new Date(serviceFee.PostedDate);
          if (isNaN(postedDate.getTime())) continue; // Skip invalid dates

          const { category, displayName } = categorizeFee(serviceFee.FeeType);

          await createFinancialEventIfNotExists({
            accountId,
            marketplaceId,
            eventType: 'ServiceFee',
            postedDate,
            description: serviceFee.FeeDescription || displayName,
            amount: -parseFloat(serviceFee.FeeAmount?.Amount || '0'),
            currency: serviceFee.FeeAmount?.CurrencyCode || 'USD',
            feeType: serviceFee.FeeType,
            feeCategory: category,
          });

          totalProcessed++;
        }
      }
    } while (nextToken); // Continue if there's more data

    console.log(`  ✅ Chunk complete: ${pageCount} pages, ${totalProcessed} events`);
    return totalProcessed;
  }

  async syncAllTransactions(accountId: string, daysBack: number = 730) {
    try {
      // Load fee category mappings
      await loadFeeCategoryMappings();

      // Get account for marketplace info
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      const marketplaceId = account?.marketplaceId;

      let totalProcessed = 0;

      // Sync in 30-day chunks to avoid TTL expiration
      const chunkSizeDays = 30;
      const totalDays = daysBack;
      const endDate = new Date();
      endDate.setHours(0, 0, 0, 0);

      console.log(`📅 Syncing all transactions (DEFERRED, DEFERRED_RELEASED, RELEASED) for ${totalDays} days in ${chunkSizeDays}-day chunks`);

      for (let dayOffset = 0; dayOffset < totalDays; dayOffset += chunkSizeDays) {
        const chunkEnd = subDays(endDate, dayOffset);
        const chunkStart = subDays(endDate, Math.min(dayOffset + chunkSizeDays, totalDays));

        console.log(`\n📦 Chunk ${Math.floor(dayOffset / chunkSizeDays) + 1}: ${chunkStart.toISOString().split('T')[0]} to ${chunkEnd.toISOString().split('T')[0]}`);

        const processed = await this.syncTransactionsRange(
          accountId,
          marketplaceId,
          chunkStart.toISOString(),
          chunkEnd.toISOString()
        );

        totalProcessed += processed;

        if (processed === 0) {
          console.log(`✅ No more transactions found, stopping sync`);
          break;
        }
      }

      console.log(`\n✅ Total transactions sync completed: ${totalProcessed} transactions processed`);
      return { success: true, transactionsProcessed: totalProcessed };
    } catch (error) {
      console.error('Error syncing transactions:', error);
      throw error;
    }
  }

  private async syncTransactionsRange(
    accountId: string,
    marketplaceId: string | undefined,
    postedAfter: string,
    postedBefore: string
  ) {
    let totalProcessed = 0;
    let nextToken: string | undefined;
    let pageCount = 0;

    do {
      pageCount++;
      console.log(`  📄 Page ${pageCount}...`);

      const requestParams: any = {
        postedAfter,
        postedBefore,
        // Don't filter by transactionStatus to get ALL transactions
      };

      // Don't filter by marketplace to get all transactions across all EU marketplaces
      // if (marketplaceId) {
      //   requestParams.marketplaceId = marketplaceId;
      // }

      if (nextToken) {
        requestParams.nextToken = nextToken;
      }

      const response = await this.spapi.listTransactions(requestParams);
      const transactions = response.transactions || [];
      nextToken = response.nextToken;

      console.log(`  Found ${transactions.length} transactions on this page`);

      // Process each transaction
      for (const transaction of transactions) {
        // Skip if no valid date
        if (!transaction.postedDate) continue;

        // Skip DEFERRED and DEFERRED_RELEASED transactions to avoid duplicates (we only want RELEASED)
        if (transaction.transactionStatus === 'DEFERRED' || transaction.transactionStatus === 'DEFERRED_RELEASED') {
          continue;
        }

        const postedDate = new Date(transaction.postedDate);
        if (isNaN(postedDate.getTime())) continue; // Skip invalid dates

        // Extract order ID from relatedIdentifiers array
        const orderIdIdentifier = transaction.relatedIdentifiers?.find(
          (id: any) => id.relatedIdentifierName === 'ORDER_ID'
        );
        const amazonOrderId = orderIdIdentifier?.relatedIdentifierValue;

        if (amazonOrderId === '404-3539693-6613944') {
          console.log(`DEBUG: Order ${amazonOrderId} Status: ${transaction.transactionStatus} Date: ${transaction.postedDate}`);
        }

        // Extract SKU from items if available
        const firstItem = transaction.items?.[0];
        const productContext = firstItem?.contexts?.find((c: any) => c.contextType === 'ProductContext');
        const sku = productContext?.sku;

        // Extract marketplace from transaction (use transaction's marketplace, not account's default)
        const transactionMarketplaceId = transaction.marketplaceDetails?.marketplaceId || transaction.sellingPartnerMetadata?.marketplaceId;

        // Parse breakdowns to extract revenue and fees separately
        const breakdowns = transaction.breakdowns || [];

        // Process Sales breakdown (Revenue)
        const salesBreakdown = breakdowns.find((b: any) => b.breakdownType === 'Sales');
        if (salesBreakdown && salesBreakdown.breakdownAmount) {
          const revenue = parseFloat(salesBreakdown.breakdownAmount.currencyAmount || '0');
          const currency = salesBreakdown.breakdownAmount.currencyCode || 'USD';

          if (revenue !== 0) {
            await createFinancialEventIfNotExists({
              accountId,
              marketplaceId: transactionMarketplaceId || marketplaceId,
              eventType: 'OrderRevenue',
              postedDate,
              amazonOrderId,
              sku,
              financialEventId: transaction.transactionId,
              description: `Revenue - ${transaction.transactionStatus || 'RELEASED'}`,
              amount: revenue,
              currency,
            });

            totalProcessed++;
          }
        }

        // Process Expenses breakdown (Fees)
        const expensesBreakdown = breakdowns.find((b: any) => b.breakdownType === 'Expenses');
        if (expensesBreakdown && expensesBreakdown.breakdowns) {
          // Process Amazon Fees
          const amazonFeesBreakdown = expensesBreakdown.breakdowns.find((b: any) => b.breakdownType === 'AmazonFees');
          if (amazonFeesBreakdown && amazonFeesBreakdown.breakdowns) {
            for (const feeBreakdown of amazonFeesBreakdown.breakdowns) {
              const feeAmount = parseFloat(feeBreakdown.breakdownAmount?.currencyAmount || '0');
              const currency = feeBreakdown.breakdownAmount?.currencyCode || 'USD';

              if (feeAmount !== 0) {
                const { category, displayName } = categorizeFee(feeBreakdown.breakdownType);

                await createFinancialEventIfNotExists({
                  accountId,
                  marketplaceId: transactionMarketplaceId || marketplaceId,
                  eventType: 'Fee',
                  postedDate,
                  amazonOrderId,
                  sku,
                  financialEventId: `${transaction.transactionId}-${feeBreakdown.breakdownType}`,
                  description: displayName,
                  amount: feeAmount,
                  currency,
                  feeType: feeBreakdown.breakdownType,
                  feeCategory: category,
                });

                totalProcessed++;
              }
            }
          }

          // Process Digital Services Fee
          const digitalServicesFee = expensesBreakdown.breakdowns.find((b: any) => b.breakdownType === 'DigitalServicesFee');
          if (digitalServicesFee && digitalServicesFee.breakdownAmount) {
            const feeAmount = parseFloat(digitalServicesFee.breakdownAmount.currencyAmount || '0');
            const currency = digitalServicesFee.breakdownAmount.currencyCode || 'USD';

            if (feeAmount !== 0) {
              const { category, displayName } = categorizeFee('DigitalServicesFee');

              await createFinancialEventIfNotExists({
                accountId,
                marketplaceId: transactionMarketplaceId || marketplaceId,
                eventType: 'Fee',
                postedDate,
                amazonOrderId,
                sku,
                financialEventId: `${transaction.transactionId}-DigitalServicesFee`,
                description: displayName,
                amount: feeAmount,
                currency,
                feeType: 'DigitalServicesFee',
                feeCategory: category,
              });

              totalProcessed++;
            }
          }
        }
      }
    } while (nextToken); // Continue if there's more data

    console.log(`  ✅ Chunk complete: ${pageCount} pages, ${totalProcessed} events`);
    return totalProcessed;
  }

  async calculateProfit(accountId: string, params: {
    startDate: Date;
    endDate: Date;
    groupBy?: 'day' | 'week' | 'month' | 'product';
    marketplaceIds?: string[];
    skus?: string[];
  }) {
    const { startDate, endDate, marketplaceIds, skus } = params;

    // Get orders by purchaseDate (actual sale date)
    const ordersWhere: any = {
      accountId,
      purchaseDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (marketplaceIds && marketplaceIds.length > 0) {
      ordersWhere.marketplaceId = { in: marketplaceIds };
    }

    const orders = await prisma.order.findMany({
      where: ordersWhere,
      include: {
        items: {
          where: skus && skus.length > 0 ? { sku: { in: skus } } : undefined,
          include: {
            product: true,
          },
        },
      },
    });

    // Get financial events for those specific orders
    // Important: Filter by order IDs, not by postedDate, to handle deferred transactions correctly
    const orderIds = orders.map((o: any) => o.amazonOrderId);

    const eventsWhere: any = {
      accountId,
      amazonOrderId: { in: orderIds },
    };

    if (marketplaceIds && marketplaceIds.length > 0) {
      eventsWhere.marketplaceId = { in: marketplaceIds };
    }

    if (skus && skus.length > 0) {
      eventsWhere.sku = { in: skus };
    }

    const events = await prisma.financialEvent.findMany({
      where: eventsWhere,
    });

    // Calculate revenue from order.totalAmount (same as Orders page)
    // This ensures revenue is based on when the order was made (purchaseDate), not when Amazon released payment
    let revenue = orders.reduce((sum: any, order: any) => sum + order.totalAmount, 0);

    const refunds = events
      .filter((e: any) => e.eventType === 'Refund')
      .reduce((sum: any, e: any) => sum + Math.abs(e.amount), 0);

    const fees = events
      .filter((e: any) => e.eventType === 'Fee' || e.eventType === 'ServiceFee')
      .reduce((sum: any, e: any) => sum + Math.abs(e.amount), 0);

    // Note: We no longer add estimated revenue for orders without financial events
    // because we now sync DEFERRED transactions via Finances API v2024-06-19
    // All orders, including those with deferred status, should have financial events

    // Calculate all 13 metrics
    let units = 0;
    let promo = 0;
    let shipping_costs = 0;
    let giftwrap = 0;
    let vat = 0;
    let cogs = 0;

    orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        units += item.quantity;
        promo += item.promotionDiscount || 0;
        shipping_costs += item.shippingPrice || 0;
        vat += (item.itemTax || 0) + (item.shippingTax || 0);
        cogs += (item.product.cost || 0) * item.quantity;
      });
    });

    // Get advertising cost from AdMetrics
    const adMetricsWhere: any = {
      accountId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (skus && skus.length > 0) {
      adMetricsWhere.sku = { in: skus };
    }

    const adMetrics = await prisma.adMetrics.findMany({
      where: adMetricsWhere,
    });

    const advertising_cost = adMetrics.reduce((sum: any, metric: any) => sum + metric.spend, 0);

    // Extract giftwrap charges from financial events (if any)
    giftwrap = events
      .filter((e: any) => e.description?.toLowerCase().includes('giftwrap') || e.feeType?.toLowerCase().includes('giftwrap'))
      .reduce((sum: any, e: any) => sum + Math.abs(e.amount), 0);

    // Placeholders for metrics not yet available
    const indirect_expenses = 0; // To be added manually by user
    const sessions = 0; // Requires Sales & Traffic report integration
    const sellable_returns = 0; // Requires Returns report integration

    // Calculate net profit
    // Note: revenue (from order.totalAmount) includes VAT, which is a pass-through cost
    // VAT is collected from customers and paid to the state, so it's not subtracted from net profit
    // We track VAT separately only as a metric, not as a business expense
    const netProfit = revenue - refunds - fees - cogs - advertising_cost - indirect_expenses;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      sales: revenue,
      units,
      promo,
      advertising_cost,
      shipping_costs,
      giftwrap,
      refund_cost: refunds,
      amazon_fees: fees,
      cost_of_goods: cogs,
      vat,
      indirect_expenses,
      sessions,
      sellable_returns,
      // Keep legacy fields for backwards compatibility
      revenue,
      refunds,
      fees,
      cogs,
      netProfit,
      margin,
      orderCount: orders.length,
    };
  }

  async getDailyStats(accountId: string, params: {
    startDate: Date;
    endDate: Date;
    marketplaceIds?: string[];
    skus?: string[];
  }) {
    // Get orders for the date range (by purchaseDate)
    const ordersWhere: any = {
      accountId,
      purchaseDate: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };

    if (params.marketplaceIds && params.marketplaceIds.length > 0) {
      ordersWhere.marketplaceId = { in: params.marketplaceIds };
    }

    const orders = await prisma.order.findMany({
      where: ordersWhere,
      include: {
        items: {
          where: params.skus && params.skus.length > 0 ? { sku: { in: params.skus } } : undefined,
          include: {
            product: true,
          },
        },
      },
    });

    // Get financial events for those specific orders (not by postedDate)
    const orderIds = orders.map((o: any) => o.amazonOrderId);

    const where: any = {
      accountId,
      amazonOrderId: { in: orderIds },
    };

    if (params.marketplaceIds && params.marketplaceIds.length > 0) {
      where.marketplaceId = { in: params.marketplaceIds };
    }

    if (params.skus && params.skus.length > 0) {
      where.sku = { in: params.skus };
    }

    const events = await prisma.financialEvent.findMany({
      where,
      orderBy: {
        postedDate: 'asc',
      },
    });

    // Get advertising metrics for the date range
    const adMetricsWhere: any = {
      accountId,
      date: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };

    if (params.skus && params.skus.length > 0) {
      adMetricsWhere.sku = { in: params.skus };
    }

    const adMetrics = await prisma.adMetrics.findMany({
      where: adMetricsWhere,
    });

    // Group by day
    const dailyStats: Record<string, any> = {};

    // Initialize all dates in range
    const currentDate = new Date(params.startDate);
    while (currentDate <= params.endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyStats[dateKey] = {
        date: dateKey,
        sales: 0,
        units: 0,
        promo: 0,
        advertising_cost: 0,
        shipping_costs: 0,
        giftwrap: 0,
        refund_cost: 0,
        amazon_fees: 0,
        cost_of_goods: 0,
        vat: 0,
        indirect_expenses: 0,
        sessions: 0,
        sellable_returns: 0,
        // Legacy fields
        revenue: 0,
        fees: 0,
        refunds: 0,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process financial events
    for (const event of events) {
      const dateKey = event.postedDate.toISOString().split('T')[0];

      if (!dailyStats[dateKey]) continue;

      if (event.eventType === 'OrderRevenue') {
        dailyStats[dateKey].sales += event.amount;
        dailyStats[dateKey].revenue += event.amount;
      } else if (event.eventType === 'Fee' || event.eventType === 'ServiceFee') {
        dailyStats[dateKey].amazon_fees += Math.abs(event.amount);
        dailyStats[dateKey].fees += Math.abs(event.amount);

        // Check for giftwrap fees
        if (event.description?.toLowerCase().includes('giftwrap') || event.feeType?.toLowerCase().includes('giftwrap')) {
          dailyStats[dateKey].giftwrap += Math.abs(event.amount);
        }
      } else if (event.eventType === 'Refund') {
        dailyStats[dateKey].refund_cost += Math.abs(event.amount);
        dailyStats[dateKey].refunds += Math.abs(event.amount);
      }
    }

    // Process orders
    for (const order of orders) {
      const dateKey = order.purchaseDate.toISOString().split('T')[0];

      if (!dailyStats[dateKey]) continue;

      for (const item of order.items) {
        dailyStats[dateKey].units += item.quantity;
        dailyStats[dateKey].promo += item.promotionDiscount || 0;
        dailyStats[dateKey].shipping_costs += item.shippingPrice || 0;
        dailyStats[dateKey].vat += (item.itemTax || 0) + (item.shippingTax || 0);
        dailyStats[dateKey].cost_of_goods += (item.product.cost || 0) * item.quantity;
      }
    }

    // Process advertising metrics
    for (const metric of adMetrics) {
      const dateKey = metric.date.toISOString().split('T')[0];

      if (!dailyStats[dateKey]) continue;

      dailyStats[dateKey].advertising_cost += metric.spend;
    }

    // Convert to array and calculate profit
    return Object.values(dailyStats).map((day: any) => ({
      ...day,
      expenses: day.fees,
      profit: day.revenue - day.fees - day.refunds - day.cost_of_goods - day.advertising_cost - day.vat,
    }));
  }

  async getProfitByProduct(accountId: string, params: {
    startDate: Date;
    endDate: Date;
  }) {
    const orders = await prisma.order.findMany({
      where: {
        accountId,
        purchaseDate: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const productStats: Record<string, any> = {};

    for (const order of orders) {
      for (const item of order.items) {
        const productId = item.product.id;

        if (!productStats[productId]) {
          productStats[productId] = {
            product: item.product,
            revenue: 0,
            cogs: 0,
            fees: 0,
            vat: 0,
            quantity: 0,
            orders: 0,
          };
        }

        productStats[productId].revenue += item.itemPrice;
        productStats[productId].cogs += (item.product.cost || 0) * item.quantity;
        productStats[productId].vat += (item.itemTax || 0) + (item.shippingTax || 0);
        productStats[productId].quantity += item.quantity;
        productStats[productId].orders += 1;
      }
    }

    // Get fees per product
    const events = await prisma.financialEvent.findMany({
      where: {
        accountId,
        postedDate: {
          gte: params.startDate,
          lte: params.endDate,
        },
        eventType: 'Fee',
      },
    });

    // Process fees
    for (const event of events) {
      if (event.sku && productStats[event.sku]) { // Assuming product.id is SKU or we have a map. Wait, productStats key is product.id (CUID), event.sku is SKU string.
        // We need to map SKU to Product ID or use SKU as key for productStats.
        // In the order loop: const productId = item.product.id;
        // item.product.id is the DB ID.
        // We need to match event.sku to the product.
        // Let's check if we can use SKU as key.
        // item.product has 'sku' field? Yes.
      }
    }

    // RE-THINKING:
    // productStats is keyed by product.id (CUID).
    // FinancialEvent has 'sku' (string).
    // We need a map from SKU to ProductID.

    // Let's change productStats key to be SKU?
    // Or build a map.

  }

  async getCostBreakdown(accountId: string, params: {
    startDate: Date;
    endDate: Date;
    marketplaceIds?: string[];
    skus?: string[];
  }) {
    const { startDate, endDate, marketplaceIds, skus } = params;

    // First, get orders by purchaseDate (same as calculateProfit)
    const ordersWhere: any = {
      accountId,
      purchaseDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (marketplaceIds && marketplaceIds.length > 0) {
      ordersWhere.marketplaceId = { in: marketplaceIds };
    }

    const orders = await prisma.order.findMany({
      where: ordersWhere,
      include: {
        items: {
          where: skus && skus.length > 0 ? { sku: { in: skus } } : undefined,
        },
      },
    });

    // Get fee events for those specific orders (not by postedDate)
    const orderIds = orders.map((o: any) => o.amazonOrderId);

    const whereClause: any = {
      accountId,
      amazonOrderId: { in: orderIds },
      eventType: {
        in: ['Fee', 'ServiceFee'],
      },
    };

    if (marketplaceIds && marketplaceIds.length > 0) {
      whereClause.marketplaceId = { in: marketplaceIds };
    }

    if (skus && skus.length > 0) {
      whereClause.sku = { in: skus };
    }

    const fees = await prisma.financialEvent.findMany({
      where: whereClause,
    });

    // Group by fee category
    const breakdown: Record<string, {
      category: string;
      displayName: string;
      total: number;
      count: number;
      fees: Array<{ feeType: string; amount: number; count: number }>;
    }> = {};

    for (const fee of fees) {
      const category = fee.feeCategory || 'other';

      if (!breakdown[category]) {
        breakdown[category] = {
          category,
          displayName: this.getCategoryDisplayName(category),
          total: 0,
          count: 0,
          fees: [],
        };
      }

      breakdown[category].total += Math.abs(fee.amount);
      breakdown[category].count += 1;

      // Track individual fee types within category
      const existingFee = breakdown[category].fees.find(f => f.feeType === fee.feeType);
      if (existingFee) {
        existingFee.amount += Math.abs(fee.amount);
        existingFee.count += 1;
      } else {
        breakdown[category].fees.push({
          feeType: fee.feeType || 'Unknown',
          amount: Math.abs(fee.amount),
          count: 1,
        });
      }
    }

    // Calculate totals and percentages
    const totalFees = Object.values(breakdown).reduce((sum, cat) => sum + cat.total, 0);

    return {
      totalFees,
      categories: Object.values(breakdown).map(cat => ({
        ...cat,
        percentage: totalFees > 0 ? (cat.total / totalFees) * 100 : 0,
        fees: cat.fees.sort((a, b) => b.amount - a.amount), // Sort by amount desc
      })).sort((a, b) => b.total - a.total), // Sort categories by total desc
    };
  }

  private getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
      referral: 'Referral Fees',
      fba_fulfillment: 'FBA Fulfillment',
      storage: 'Storage Fees',
      advertising: 'Advertising',
      shipping: 'Shipping',
      removal: 'Removal & Disposal',
      service: 'Service Fees',
      other: 'Other Fees',
    };

    return names[category] || category;
  }

  async getMarketplaceStats(accountId: string, params: {
    startDate: Date;
    endDate: Date;
  }) {
    // Get orders in the date range with their marketplace IDs
    const orders = await prisma.order.findMany({
      where: {
        accountId,
        purchaseDate: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      select: {
        amazonOrderId: true,
        marketplaceId: true,
      },
    });

    // Create map of order ID to marketplace ID
    const orderMarketplaceMap = new Map(
      orders.map((o: any) => [o.amazonOrderId, o.marketplaceId])
    );

    // Get financial events
    const events = await prisma.financialEvent.findMany({
      where: {
        accountId,
        postedDate: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
    });

    const stats: Record<string, {
      marketplaceId: string;
      revenue: number;
      fees: number;
      refunds: number;
      orderCount: number;
    }> = {};

    for (const event of events) {
      // Use order's marketplace if available, otherwise use event's marketplace
      const mpId = event.amazonOrderId
        ? (orderMarketplaceMap.get(event.amazonOrderId) || event.marketplaceId)
        : event.marketplaceId;

      // Skip events without marketplace
      if (!mpId) continue;

      if (!stats[mpId]) {
        stats[mpId] = {
          marketplaceId: mpId,
          revenue: 0,
          fees: 0,
          refunds: 0,
          orderCount: 0,
        };
      }

      if (event.eventType === 'OrderRevenue') {
        stats[mpId].revenue += event.amount;
        stats[mpId].orderCount += 1;
      } else if (event.eventType === 'Fee' || event.eventType === 'ServiceFee') {
        stats[mpId].fees += Math.abs(event.amount);
      } else if (event.eventType === 'Refund') {
        stats[mpId].refunds += Math.abs(event.amount);
      }
    }

    return Object.values(stats).map(s => ({
      ...s,
      netProfit: s.revenue - s.fees - s.refunds,
      margin: s.revenue > 0 ? ((s.revenue - s.fees - s.refunds) / s.revenue) * 100 : 0,
    }));
  }
}

export default FinanceService;
