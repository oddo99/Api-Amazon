import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndFixOrder() {
  const order = await prisma.order.findFirst({
    where: { amazonOrderId: '407-8190677-8295525' },
    include: { items: true }
  });

  console.log('Current totalAmount:', order?.totalAmount);

  // Calculate correct totalAmount
  const correctTotal = order?.items.reduce((sum, item) => {
    return sum + (item.itemPrice * item.quantity) + item.shippingPrice - item.promotionDiscount;
  }, 0) || 0;

  console.log('Calculated totalAmount from items:', correctTotal);
  console.log('Items breakdown:');
  order?.items.forEach(item => {
    const itemTotal = item.itemPrice * item.quantity + item.shippingPrice - item.promotionDiscount;
    console.log(`  - ${item.sku}: ${item.itemPrice} x ${item.quantity} + shipping ${item.shippingPrice} - promo ${item.promotionDiscount} = ${itemTotal}`);
  });

  // Update if needed
  if (order && Math.abs(order.totalAmount - correctTotal) > 0.01) {
    console.log('\nUpdating order totalAmount to:', correctTotal);
    await prisma.order.update({
      where: { id: order.id },
      data: { totalAmount: correctTotal }
    });
    console.log('✅ Updated!');
  } else {
    console.log('\nNo update needed (difference < 0.01)');
  }

  await prisma.$disconnect();
}

checkAndFixOrder();
