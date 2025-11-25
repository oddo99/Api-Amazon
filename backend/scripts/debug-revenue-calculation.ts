import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugRevenueCalculation() {
  const order = await prisma.order.findFirst({
    where: { amazonOrderId: '407-8190677-8295525' },
    include: {
      items: {
        include: { product: true }
      }
    }
  });

  if (!order) {
    console.log('Order not found');
    return;
  }

  console.log('📦 Order:', order.amazonOrderId);
  console.log('  totalAmount:', order.totalAmount);

  // Simulate what calculateProfit does
  let revenue = order.totalAmount;
  let vat = 0;
  let cogs = 0;
  let units = 0;
  let promo = 0;
  let shipping_costs = 0;

  order.items.forEach(item => {
    units += item.quantity;
    promo += item.promotionDiscount || 0;
    shipping_costs += item.shippingPrice || 0;
    vat += (item.itemTax || 0) + (item.shippingTax || 0);
    cogs += (item.product.cost || 0) * item.quantity;

    console.log(`\n  Item ${item.sku}:`);
    console.log(`    itemPrice: ${item.itemPrice}`);
    console.log(`    itemTax: ${item.itemTax}`);
    console.log(`    shippingPrice: ${item.shippingPrice}`);
    console.log(`    shippingTax: ${item.shippingTax}`);
    console.log(`    promotionDiscount: ${item.promotionDiscount}`);
    console.log(`    product.cost: ${item.product.cost}`);
    console.log(`    quantity: ${item.quantity}`);
  });

  console.log('\n📊 Calculated values:');
  console.log(`  revenue (from totalAmount): ${revenue}`);
  console.log(`  vat: ${vat}`);
  console.log(`  cogs: ${cogs}`);
  console.log(`  promo: ${promo}`);
  console.log(`  shipping_costs: ${shipping_costs}`);

  // Check for financial events
  const events = await prisma.financialEvent.findMany({
    where: { amazonOrderId: order.amazonOrderId }
  });

  const refunds = events.filter(e => e.eventType === 'Refund').reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const fees = events.filter(e => e.eventType === 'Fee' || e.eventType === 'ServiceFee').reduce((sum, e) => sum + Math.abs(e.amount), 0);

  console.log(`\n  Financial events:`);
  console.log(`    refunds: ${refunds}`);
  console.log(`    fees: ${fees}`);

  const netProfit = revenue - refunds - fees - cogs - 0 - vat - 0;

  console.log(`\n💰 Final calculation:`);
  console.log(`  netProfit = revenue - refunds - fees - cogs - advertising - vat - indirect`);
  console.log(`  netProfit = ${revenue} - ${refunds} - ${fees} - ${cogs} - 0 - ${vat} - 0`);
  console.log(`  netProfit = ${netProfit}`);

  await prisma.$disconnect();
}

debugRevenueCalculation();
