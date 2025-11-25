import { PrismaClient } from '@prisma/client';
import SPAPIService from './spapi.service';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

export class OrderService {
  private spapi: SPAPIService;
  private sellingPartnerId?: string;

  constructor(accountId: string, sellingPartnerId?: string) {
    this.sellingPartnerId = sellingPartnerId;
    this.spapi = new SPAPIService(accountId, sellingPartnerId);
  }

  async syncOrders(accountId: string, daysBack: number = 730, sellingPartnerId?: string, useLastUpdated: boolean = false) {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // All EU marketplaces with names for logging
      const euMarketplaces = [
        { id: 'A1F83G8C2ARO7P', name: 'UK' },
        { id: 'A1PA6795UKMFR9', name: 'Germany' },
        { id: 'A13V1IB3VIYZZH', name: 'France' },
        { id: 'APJ6JRA9NG5V4', name: 'Italy' },
        { id: 'A1RKKUPIHCS9HS', name: 'Spain' },
        { id: 'A1805IZSGTT6HS', name: 'Netherlands' },
      ];

      let allOrders: any[] = [];
      const marketplaceStats: Record<string, number> = {};

      // Determine if we need chunking (for large date ranges)
      const CHUNK_SIZE_DAYS = 30;
      const needsChunking = daysBack > CHUNK_SIZE_DAYS;

      if (needsChunking) {
        console.log(`📦 Syncing orders for ${daysBack} days in ${CHUNK_SIZE_DAYS}-day chunks across ${euMarketplaces.length} EU marketplaces...`);

        // Calculate date chunks
        // Amazon requires CreatedBefore to be at least 2 minutes in the past
        const now = new Date();
        now.setMinutes(now.getMinutes() - 2); // Subtract 2 minutes

        const chunks: Array<{ start: Date; end: Date; }> = [];

        for (let i = 0; i < daysBack; i += CHUNK_SIZE_DAYS) {
          const chunkEnd = subDays(now, i);
          const chunkStart = subDays(now, Math.min(i + CHUNK_SIZE_DAYS, daysBack));
          chunks.push({ start: chunkStart, end: chunkEnd });
        }

        console.log(`📅 Total chunks: ${chunks.length}\n`);

        // Process each chunk for each marketplace
        for (const marketplace of euMarketplaces) {
          let marketplaceOrders = 0;
          console.log(`🌍 ${marketplace.name} (${marketplace.id}):`);

          try {
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
              const chunk = chunks[chunkIndex];
              let nextToken: string | undefined = undefined;
              let pageCount = 0;
              let chunkOrders = 0;

              // Only log chunk details for full syncs (not incremental 7-day syncs)
              if (chunks.length > 1) {
                console.log(`   📦 Chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.start.toISOString().split('T')[0]} to ${chunk.end.toISOString().split('T')[0]}`);
              }

              do {
                pageCount++;
                if (chunks.length > 1 || pageCount > 1) {
                  console.log(`      📄 Page ${pageCount}...`);
                }

                const queryParams: any = {
                  MarketplaceIds: [marketplace.id],
                  NextToken: nextToken,
                };

                if (useLastUpdated) {
                  queryParams.LastUpdatedAfter = chunk.start.toISOString();
                  queryParams.LastUpdatedBefore = chunk.end.toISOString();
                } else {
                  queryParams.CreatedAfter = chunk.start.toISOString();
                  queryParams.CreatedBefore = chunk.end.toISOString();
                }

                const ordersResponse = await this.spapi.getOrders(queryParams);

                const orders = ordersResponse.Orders || [];
                allOrders = allOrders.concat(orders);
                chunkOrders += orders.length;
                nextToken = ordersResponse.NextToken;

              } while (nextToken);

              marketplaceOrders += chunkOrders;

              if (chunks.length > 1) {
                console.log(`      ✅ Chunk complete: ${pageCount} page${pageCount > 1 ? 's' : ''}, ${chunkOrders} orders`);
              }
            }

            marketplaceStats[marketplace.name] = marketplaceOrders;
            console.log(`   ✅ Total: ${marketplaceOrders} orders\n`);

          } catch (error: any) {
            console.error(`   ❌ Error fetching from ${marketplace.name}:`, error.message);
            marketplaceStats[marketplace.name] = 0;
          }
        }

      } else {
        // For small date ranges (like 7-day incremental sync), no chunking needed
        // Amazon requires CreatedBefore/LastUpdatedBefore to be at least 2 minutes in the past
        const now = new Date();
        now.setMinutes(now.getMinutes() - 2);
        const startDate = subDays(now, daysBack).toISOString();
        const endDate = now.toISOString();

        console.log(`📦 Fetching orders from ${euMarketplaces.length} EU marketplaces separately...`);

        for (const marketplace of euMarketplaces) {
          let nextToken: string | undefined = undefined;
          let pageCount = 0;
          let marketplaceOrders = 0;

          console.log(`\n🌍 ${marketplace.name} (${marketplace.id}):`);

          try {
            do {
              pageCount++;
              console.log(`   📄 Fetching page ${pageCount}...`);

              const queryParams: any = {
                MarketplaceIds: [marketplace.id],
                NextToken: nextToken,
              };

              if (useLastUpdated) {
                queryParams.LastUpdatedAfter = startDate;
                queryParams.LastUpdatedBefore = endDate;
              } else {
                queryParams.CreatedAfter = startDate;
                queryParams.CreatedBefore = endDate;
              }

              const ordersResponse = await this.spapi.getOrders(queryParams);

              const orders = ordersResponse.Orders || [];
              allOrders = allOrders.concat(orders);
              marketplaceOrders += orders.length;
              nextToken = ordersResponse.NextToken;

            } while (nextToken);

            marketplaceStats[marketplace.name] = marketplaceOrders;
            console.log(`   ✅ ${marketplaceOrders} orders found (${pageCount} pages)`);

          } catch (error: any) {
            console.error(`   ❌ Error fetching from ${marketplace.name}:`, error.message);
            marketplaceStats[marketplace.name] = 0;
          }
        }
      }

      console.log(`\n📊 Summary by marketplace:`);
      Object.entries(marketplaceStats).forEach(([name, count]) => {
        console.log(`   ${name.padEnd(12)}: ${count} orders`);
      });
      console.log(`\n✅ Total: ${allOrders.length} orders from all marketplaces`);

      // Process orders in batches with progress logging
      console.log(`\n💾 Saving orders to database...`);
      const BATCH_SIZE = 50;
      let ordersProcessed = 0;
      let ordersSaved = 0;
      let itemsSaved = 0;

      for (let i = 0; i < allOrders.length; i += BATCH_SIZE) {
        const batch = allOrders.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(allOrders.length / BATCH_SIZE);

        console.log(`   📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} orders)...`);

        for (const orderData of batch) {
          try {
            // Determine if this is a B2B order
            const isBusinessOrder = orderData.IsBusinessOrder || false;

            // Save or update order
            const order = await prisma.order.upsert({
              where: { amazonOrderId: orderData.AmazonOrderId },
              update: {
                orderStatus: orderData.OrderStatus,
                totalAmount: parseFloat(orderData.OrderTotal?.Amount || '0'),
                isBusinessOrder,
                updatedAt: new Date(),
              },
              create: {
                accountId,
                amazonOrderId: orderData.AmazonOrderId,
                purchaseDate: new Date(orderData.PurchaseDate),
                orderStatus: orderData.OrderStatus,
                totalAmount: parseFloat(orderData.OrderTotal?.Amount || '0'),
                currency: orderData.OrderTotal?.CurrencyCode || 'USD',
                numberOfItems: orderData.NumberOfItemsShipped + orderData.NumberOfItemsUnshipped,
                marketplaceId: orderData.MarketplaceId,
                buyerEmail: orderData.BuyerInfo?.BuyerEmail,
                shippingAddress: orderData.ShippingAddress || {},
                isBusinessOrder,
              },
            });
            ordersSaved++;

            // Fetch and save order items
            try {
              const itemsResponse = await this.spapi.getOrderItems(orderData.AmazonOrderId);
              const items = itemsResponse.OrderItems || [];

              for (const itemData of items) {
                // Parse price fields
                const itemPriceGross = parseFloat(itemData.ItemPrice?.Amount || '0');
                const itemTaxAmount = parseFloat(itemData.ItemTax?.Amount || '0');
                const shippingPriceGross = parseFloat(itemData.ShippingPrice?.Amount || '0');
                const shippingTaxAmount = parseFloat(itemData.ShippingTax?.Amount || '0');
                const promotionDiscountAmount = parseFloat(itemData.PromotionDiscount?.Amount || '0');

                // Calculate net prices (VAT-exclusive)
                // For B2C orders: ItemPrice includes VAT, so we subtract ItemTax to get net price
                // For B2B orders: ItemPrice is already net (reverse charge), no need to subtract
                const itemPriceNet = isBusinessOrder ? itemPriceGross : (itemPriceGross - itemTaxAmount);
                const shippingPriceNet = isBusinessOrder ? shippingPriceGross : (shippingPriceGross - shippingTaxAmount);

                // Find or create product
                let product = await prisma.product.findFirst({
                  where: {
                    accountId,
                    sku: itemData.SellerSKU,
                  },
                });

                if (!product) {
                  product = await prisma.product.create({
                    data: {
                      accountId,
                      asin: itemData.ASIN,
                      sku: itemData.SellerSKU,
                      title: itemData.Title,
                      price: itemPriceNet, // Store net price
                      marketplaceId: orderData.MarketplaceId, // Save marketplace ID
                    },
                  });
                }

                // Save order item with net prices
                await prisma.orderItem.upsert({
                  where: {
                    id: `${order.id}-${itemData.OrderItemId}`,
                  },
                  update: {
                    quantity: itemData.QuantityOrdered,
                    itemPrice: itemPriceNet, // Store net price (VAT-exclusive)
                    itemTax: itemTaxAmount,
                    shippingPrice: shippingPriceNet, // Store net shipping price
                    shippingTax: shippingTaxAmount,
                    promotionDiscount: promotionDiscountAmount,
                  },
                  create: {
                    id: `${order.id}-${itemData.OrderItemId}`,
                    orderId: order.id,
                    productId: product.id,
                    asin: itemData.ASIN,
                    sku: itemData.SellerSKU,
                    title: itemData.Title,
                    quantity: itemData.QuantityOrdered,
                    itemPrice: itemPriceNet, // Store net price (VAT-exclusive)
                    itemTax: itemTaxAmount,
                    shippingPrice: shippingPriceNet, // Store net shipping price
                    shippingTax: shippingTaxAmount,
                    promotionDiscount: promotionDiscountAmount,
                  },
                });
                itemsSaved++;
              }
            } catch (itemError: any) {
              console.error(`      ⚠️  Failed to fetch items for order ${orderData.AmazonOrderId}: ${itemError.message}`);
              // Continue with next order even if items fetch fails
            }

            ordersProcessed++;
          } catch (orderError: any) {
            console.error(`      ⚠️  Failed to save order ${orderData.AmazonOrderId}: ${orderError.message}`);
            // Continue with next order even if save fails
          }
        }

        console.log(`      ✅ Batch ${batchNum} complete: ${ordersSaved} orders, ${itemsSaved} items saved so far`);
      }

      console.log(`\n✅ All orders processed!`);
      console.log(`   Orders saved: ${ordersSaved}/${allOrders.length}`);
      console.log(`   Items saved: ${itemsSaved}`);

      return { success: true, ordersProcessed: ordersSaved };
    } catch (error) {
      console.error('Error syncing orders:', error);
      throw error;
    }
  }

  async getOrders(accountId: string, params?: {
    startDate?: Date;
    endDate?: Date;
    statuses?: string[];
    marketplaceIds?: string[];
  }) {
    const where: any = { accountId };

    if (params?.startDate || params?.endDate) {
      where.purchaseDate = {};
      if (params.startDate) where.purchaseDate.gte = params.startDate;
      if (params.endDate) where.purchaseDate.lte = params.endDate;
    }

    if (params?.statuses && params.statuses.length > 0) {
      where.orderStatus = { in: params.statuses };
    }

    if (params?.marketplaceIds && params.marketplaceIds.length > 0) {
      // Handle both official marketplace IDs (APJ6JRA9NG5V4) and legacy domain format (Amazon.it)
      // Some orders in database have mixed formats, so we need to check both
      const marketplaceIdAliases: Record<string, string[]> = {
        'APJ6JRA9NG5V4': ['APJ6JRA9NG5V4', 'Amazon.it', 'amazon.it'],
        'A1PA6795UKMFR9': ['A1PA6795UKMFR9', 'Amazon.de', 'amazon.de'],
        'A13V1IB3VIYZZH': ['A13V1IB3VIYZZH', 'Amazon.fr', 'amazon.fr'],
        'A1RKKUPIHCS9HS': ['A1RKKUPIHCS9HS', 'Amazon.es', 'amazon.es'],
        'A1F83G8C2ARO7P': ['A1F83G8C2ARO7P', 'Amazon.co.uk', 'amazon.co.uk'],
        'A1805IZSGTT6HS': ['A1805IZSGTT6HS', 'Amazon.nl', 'amazon.nl'],
      };

      // Collect all aliases for all requested marketplaces
      const allAliases: string[] = [];
      for (const mp of params.marketplaceIds) {
        const aliases = marketplaceIdAliases[mp] || [mp];
        allAliases.push(...aliases);
      }

      where.marketplaceId = { in: allAliases };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
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

    // Calculate totalAmount for orders with missing prices (Pending orders)
    // Map marketplace ID to country name (Italian) and currency
    const marketplaceInfo: Record<string, { name: string; currency: string }> = {
      'ATVPDKIKX0DER': { name: 'Stati Uniti', currency: 'USD' },
      'A2EUQ1WTGCTBG2': { name: 'Canada', currency: 'CAD' },
      'A1AM78C64UM0Y8': { name: 'Messico', currency: 'MXN' },
      'A2Q3Y263D00KWC': { name: 'Brasile', currency: 'BRL' },
      'A1F83G8C2ARO7P': { name: 'Regno Unito', currency: 'GBP' },
      'A1PA6795UKMFR9': { name: 'Germania', currency: 'EUR' },
      'A13V1IB3VIYZZH': { name: 'Francia', currency: 'EUR' },
      'APJ6JRA9NG5V4': { name: 'Italia', currency: 'EUR' },
      'A1RKKUPIHCS9HS': { name: 'Spagna', currency: 'EUR' },
      'A1805IZSGTT6HS': { name: 'Paesi Bassi', currency: 'EUR' },
      'A1VC38T7YXB528': { name: 'Giappone', currency: 'JPY' },
      'A39IBJ37TRP1C6': { name: 'Australia', currency: 'AUD' },
      'A19VAU5U5O7RUS': { name: 'Singapore', currency: 'SGD' },
      // Fallback for old format (amazon.it, amazon.de, etc. - both lowercase and capitalized)
      'amazon.it': { name: 'Italia', currency: 'EUR' },
      'Amazon.it': { name: 'Italia', currency: 'EUR' },
      'amazon.de': { name: 'Germania', currency: 'EUR' },
      'Amazon.de': { name: 'Germania', currency: 'EUR' },
      'amazon.fr': { name: 'Francia', currency: 'EUR' },
      'Amazon.fr': { name: 'Francia', currency: 'EUR' },
      'amazon.es': { name: 'Spagna', currency: 'EUR' },
      'Amazon.es': { name: 'Spagna', currency: 'EUR' },
      'amazon.co.uk': { name: 'Regno Unito', currency: 'GBP' },
      'Amazon.co.uk': { name: 'Regno Unito', currency: 'GBP' },
      'amazon.nl': { name: 'Paesi Bassi', currency: 'EUR' },
      'Amazon.nl': { name: 'Paesi Bassi', currency: 'EUR' },
      'amazon.com': { name: 'Stati Uniti', currency: 'USD' },
      'Amazon.com': { name: 'Stati Uniti', currency: 'USD' },
    };

    return orders.map((order: any) => {
      // Get marketplace info (name and currency)
      const marketplaceData = marketplaceInfo[order.marketplaceId];
      const marketplaceName = marketplaceData?.name || order.marketplaceId;
      const correctCurrency = marketplaceData?.currency || order.currency;

      // For Pending/Unshipped orders, don't calculate - wait for Amazon to provide the price
      // Show 0 until the order is processed and Amazon provides OrderTotal
      if ((order.orderStatus === 'Pending' || order.orderStatus === 'Unshipped') &&
        order.totalAmount === 0 &&
        order.orderStatus !== 'Canceled') {
        return {
          ...order,
          totalAmount: 0, // Keep as 0 until Amazon processes the order
          currency: correctCurrency,
          marketplaceName: marketplaceName, // Add country name as separate field
          financialEventId: financialEventMap.get(order.amazonOrderId) || null,
        };
      }

      return {
        ...order,
        currency: correctCurrency,
        marketplaceName: marketplaceName, // Add country name as separate field
        financialEventId: financialEventMap.get(order.amazonOrderId) || null,
      };
    });
  }

  async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}

export default OrderService;
