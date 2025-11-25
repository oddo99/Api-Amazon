import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Amazon fee type mappings based on SP-API documentation
const feeCategories = [
  // Referral Fees
  {
    feeType: 'Commission',
    category: 'referral',
    displayName: 'Referral Fee',
    description: 'Amazon commission on product sales (typically 8-15% based on category)'
  },
  {
    feeType: 'RefundCommission',
    category: 'referral',
    displayName: 'Refund Commission',
    description: 'Referral fee refunded due to order cancellation or return'
  },

  // FBA Fulfillment Fees
  {
    feeType: 'FBAPerUnitFulfillmentFee',
    category: 'fba_fulfillment',
    displayName: 'FBA Pick & Pack Fee',
    description: 'Fee for picking, packing and shipping by Amazon FBA'
  },
  {
    feeType: 'FBAWeightBasedFee',
    category: 'fba_fulfillment',
    displayName: 'FBA Weight Handling Fee',
    description: 'Weight-based fulfillment fee for heavy or oversized items'
  },
  {
    feeType: 'FBAPerOrderFulfillmentFee',
    category: 'fba_fulfillment',
    displayName: 'FBA Order Handling Fee',
    description: 'Per-order fulfillment fee'
  },

  // Storage Fees
  {
    feeType: 'StorageFee',
    category: 'storage',
    displayName: 'Monthly Storage Fee',
    description: 'Monthly fee based on cubic feet stored in Amazon warehouse'
  },
  {
    feeType: 'LongTermStorageFee',
    category: 'storage',
    displayName: 'Long-term Storage Fee',
    description: 'Additional fee for inventory stored more than 365 days'
  },
  {
    feeType: 'StorageRenewalBilling',
    category: 'storage',
    displayName: 'Storage Renewal',
    description: 'Monthly storage fee billing'
  },

  // Removal & Disposal Fees
  {
    feeType: 'RemovalFee',
    category: 'removal',
    displayName: 'Removal Fee',
    description: 'Fee for removing inventory from Amazon warehouse'
  },
  {
    feeType: 'DisposalFee',
    category: 'removal',
    displayName: 'Disposal Fee',
    description: 'Fee for disposing of inventory at Amazon warehouse'
  },

  // Shipping Fees
  {
    feeType: 'ShippingChargeback',
    category: 'shipping',
    displayName: 'Shipping Chargeback',
    description: 'Shipping fee adjustments or chargebacks'
  },
  {
    feeType: 'ShippingHoldback',
    category: 'shipping',
    displayName: 'Shipping Holdback',
    description: 'Temporary hold on shipping fees'
  },

  // Subscription & Service Fees
  {
    feeType: 'SubscriptionFee',
    category: 'service',
    displayName: 'Subscription Fee',
    description: 'Amazon Professional Seller subscription fee ($39.99/month)'
  },
  {
    feeType: 'ServiceFee',
    category: 'service',
    displayName: 'Service Fee',
    description: 'General Amazon service fees'
  },

  // Advertising Fees
  {
    feeType: 'AdvertisingFee',
    category: 'advertising',
    displayName: 'Advertising Fee',
    description: 'Amazon PPC and sponsored product advertising costs'
  },
  {
    feeType: 'CostPerClick',
    category: 'advertising',
    displayName: 'PPC Cost Per Click',
    description: 'Pay-per-click advertising costs'
  },

  // Other Fees
  {
    feeType: 'VariableClosingFee',
    category: 'other',
    displayName: 'Variable Closing Fee',
    description: 'Variable fee for media items'
  },
  {
    feeType: 'GiftWrapChargeback',
    category: 'other',
    displayName: 'Gift Wrap Fee',
    description: 'Gift wrap service fees'
  },
  {
    feeType: 'RestockingFee',
    category: 'other',
    displayName: 'Restocking Fee',
    description: 'Fee charged for restocking returned items'
  },
  {
    feeType: 'ReverseShipmentFee',
    category: 'other',
    displayName: 'Reverse Shipment Fee',
    description: 'Fee for shipping returned items back to warehouse'
  },
];

async function main() {
  console.log('Seeding fee category mappings...');

  for (const fee of feeCategories) {
    await prisma.feeCategoryMapping.upsert({
      where: { feeType: fee.feeType },
      update: fee,
      create: fee,
    });
  }

  console.log(`✅ Seeded ${feeCategories.length} fee category mappings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
