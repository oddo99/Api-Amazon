// Standalone script to sync financial events for an account
// Uses the same logic as the direct sync but self-contained

// Mock the PrismaClient and services to make it work
const { PrismaClient } = require('@prisma/client');
const SPAPIService = require('./src/services/spapi.service.js');
const FinanceService = require('./src/services/finance.service.js');
const { subDays } = require('date-fns');

const prisma = new PrismaClient();

class StandaloneFinanceService {
  constructor(accountId, sellingPartnerId) {
    this.accountId = accountId;
    this.sellingPartnerId = sellingPartnerId;
    this.spapi = new SPAPIService(accountId, sellingPartnerId);
  }

  async syncFinancialEvents(daysBack = 730) {
    try {
      // Load fee category mappings (simplified)
      const mappings = await prisma.feeCategoryMapping.findMany();
      await loadFeeCategoryMappings(mappings);

      // Get account for marketplace info
      const account = await prisma.account.findUnique({ where: { id: this.accountId } });
      const marketplaceId = account?.marketplaceId;

      const postedAfter = subDays(new Date(), daysBack).toISOString();

      let totalProcessed = 0;
      let nextToken;
      let pageCount = 0;

      do {
        pageCount++;
        console.log(`📄 Fetching financial events page ${pageCount}...`);

        const response = await this.spapi.listFinancialEvents({
          PostedAfter: postedAfter,
          MaxResultsPerPage: 100,
          NextToken: nextToken,
        });

        const events = response.FinancialEvents || {};
        nextToken = response.NextToken;

        // Process ShipmentEvents (order revenue)
        if (events.ShipmentEventList) {
          for (const shipment of events.ShipmentEventList) {
            const amazonOrderId = shipment.AmazonOrderId;
            const postedDate = new Date(shipment.PostedDate);

            // Revenue from items
            for (const item of shipment.ShipmentItemList || []) {
              let revenue = 0;
              let currency = 'USD';

              for (const charge of item.ItemChargeList || []) {
                if (charge.ChargeType === 'Principal' || charge.ChargeType === 'ShippingCharge') {
                  revenue += parseFloat(charge.ChargeAmount?.CurrencyAmount || 0);
                  currency = charge.ChargeAmount?.CurrencyCode || currency;
                }
              }

              await createFinancialEventIfNotExists({
                accountId: this.accountId,
                marketplaceId,
                eventType: 'OrderRevenue',
                postedDate,
                amazonOrderId,
                sku: item.SellerSKU,
                description: `Revenue for ${item.SellerSKU}`,
                amount: revenue,
                currency,
              });

              totalProcessed++;
            }
          }
        }

        // Process RefundEvents
        if (events.RefundEventList) {
          for (const refund of events.RefundEventList) {
            const amazonOrderId = refund.AmazonOrderId;
            const postedDate = new Date(refund.PostedDate);

            for (const item of refund.ShipmentItemList || []) {
              let refundAmount = 0;
              let currency = 'USD';

              for (const charge of item.ItemChargeList || []) {
                if (charge.ChargeType === 'Principal' || charge.ChargeType === 'ShippingCharge') {
                  refundAmount += parseFloat(charge.ChargeAmount?.CurrencyAmount || 0);
                  currency = charge.ChargeAmount?.CurrencyCode || currency;
                }
              }

              await createFinancialEventIfNotExists({
                accountId: this.accountId,
                marketplaceId,
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

      } while (nextToken);

      console.log(`✅ Processed ${pageCount} pages, ${totalProcessed} financial events total`);
      return { success: true, eventsProcessed: totalProcessed };
    } catch (error) {
      console.error('Error syncing financial events:', error);
      throw error;
    }
  }
}

// Cache for fee category mappings
let feeCategoryCache;

async function loadFeeCategoryMappings(mappings) {
  feeCategoryCache = new Map(
    mappings.map(m => [m.feeType, { category: m.category, displayName: m.displayName }])
  );
}

function categorizeFee(feeType) {
  if (!feeType) return { category: 'other', displayName: 'Other Fee' };
  const mapping = feeCategoryCache?.get(feeType);
  return mapping || { category: 'other', displayName: feeType };
}

async function createFinancialEventIfNotExists(data) {
  const existing = await prisma.financialEvent.findFirst({
    where: {
      accountId: data.accountId,
      eventType: data.eventType,
      postedDate: data.postedDate,
      amazonOrderId: data.amazonOrderId || null,
      sku: data.sku || null,
      amount: data.amount,
      feeType: data.feeType || null,
    },
  });

  if (existing) return { created: false, event: existing };

  const event = await prisma.financialEvent.create({ data });
  return { created: true, event };
}

async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: node sync-finances-standalone.js <accountId>');
    process.exit(1);
  }

  const accountId = process.argv[2];

  console.log(`Starting financial events sync for account ${accountId}...`);

  try {
    const service = new StandaloneFinanceService(accountId);
    const result = await service.syncFinancialEvents();

    console.log('✅ Sync completed successfully!');
    console.log(`📊 Processed ${result.eventsProcessed} financial events`);

    // Update TODO status
    console.log('\n📋 Task completed! Mark your TODO as done.');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();