import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugOrder() {
  // Get the order with items
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

  console.log('📦 Order from DB:');
  console.log('  amazonOrderId:', order.amazonOrderId);
  console.log('  orderStatus:', order.orderStatus);
  console.log('  totalAmount:', order.totalAmount);
  console.log('  currency:', order.currency);
  console.log('\n📝 Items:');
  order.items.forEach(item => {
    console.log('  - SKU:', item.sku);
    console.log('    itemPrice:', item.itemPrice);
    console.log('    itemTax:', item.itemTax);
    console.log('    quantity:', item.quantity);
    console.log('    product.price:', item.product.price);
  });

  // Simulate what getOrders logic does
  console.log('\n🔍 Simulating getOrders logic:');
  if ((order.totalAmount === 0 || order.orderStatus === 'Pending' || order.orderStatus === 'Unshipped') &&
      order.orderStatus !== 'Canceled') {
    console.log('  Order is Pending/Unshipped, recalculating...');
    const calculatedTotal = order.items.reduce((sum, item) => {
      const price = item.itemPrice > 0 ? item.itemPrice : (item.product.price || 0);
      console.log(`  Using price ${price} for ${item.sku} (itemPrice: ${item.itemPrice}, product.price: ${item.product.price})`);
      return sum + (price * item.quantity);
    }, 0);
    console.log('  Calculated total:', calculatedTotal);
  } else {
    console.log('  Using totalAmount from DB:', order.totalAmount);
  }

  await prisma.$disconnect();
}

debugOrder();
