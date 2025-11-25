const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const orderId = '306-9581646-5675560';

    // Get order details
    const order = await prisma.order.findUnique({
      where: { amazonOrderId: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      console.log('Ordine non trovato');
      await prisma.$disconnect();
      return;
    }

    console.log('📦 ORDINE:', orderId);
    console.log('Data:', order.purchaseDate.toISOString().split('T')[0]);
    console.log('Stato:', order.orderStatus);
    console.log('Totale ordine:', order.totalAmount, order.currency);
    console.log('Numero items:', order.numberOfItems);
    console.log('');

    // Get all financial events for this order
    const events = await prisma.financialEvent.findMany({
      where: { amazonOrderId: orderId },
      orderBy: { postedDate: 'asc' }
    });

    console.log('💰 EVENTI FINANZIARI:');
    console.log('Totale eventi:', events.length);
    console.log('');

    // Group by event type
    const revenue = events.filter(e => e.eventType === 'OrderRevenue');
    const fees = events.filter(e => e.eventType === 'Fee');
    const refunds = events.filter(e => e.eventType === 'Refund');

    console.log('📊 CALCOLO SALDO:');
    console.log('');

    // Revenue (Lordo)
    console.log('--- ENTRATE (Lordo) ---');
    let totalRevenue = 0;
    revenue.forEach(e => {
      console.log(`  + ${e.description}: €${e.amount.toFixed(2)}`);
      totalRevenue += e.amount;
    });
    console.log(`  Totale Entrate: €${totalRevenue.toFixed(2)}`);
    console.log('');

    // Fees (Costi)
    console.log('--- COMMISSIONI E COSTI ---');
    let totalFees = 0;
    const feesByCategory = {};
    fees.forEach(e => {
      const category = e.feeCategory || 'other';
      if (!feesByCategory[category]) {
        feesByCategory[category] = [];
      }
      feesByCategory[category].push(e);
      totalFees += e.amount;
    });

    Object.entries(feesByCategory).forEach(([category, categoryFees]) => {
      const categoryTotal = categoryFees.reduce((sum, e) => sum + e.amount, 0);
      console.log(`  ${category}:`);
      categoryFees.forEach(e => {
        console.log(`    - ${e.description}: €${e.amount.toFixed(2)}`);
      });
      console.log(`    Subtotale: €${categoryTotal.toFixed(2)}`);
    });
    console.log(`  Totale Commissioni: €${totalFees.toFixed(2)}`);
    console.log('');

    // Refunds
    if (refunds.length > 0) {
      console.log('--- RIMBORSI ---');
      let totalRefunds = 0;
      refunds.forEach(e => {
        console.log(`  - ${e.description}: €${e.amount.toFixed(2)}`);
        totalRefunds += e.amount;
      });
      console.log(`  Totale Rimborsi: €${totalRefunds.toFixed(2)}`);
      console.log('');
    }

    // Net balance
    const netBalance = totalRevenue + totalFees + (refunds.reduce((sum, e) => sum + e.amount, 0));
    console.log('═══════════════════════════════');
    console.log('📈 SALDO AGGIORNATO ACCOUNT VENDITORE:');
    console.log('');
    console.log(`  Lordo (Entrate):        €${totalRevenue.toFixed(2)}`);
    console.log(`  Commissioni/Costi:      €${totalFees.toFixed(2)}`);
    if (refunds.length > 0) {
      console.log(`  Rimborsi:               €${refunds.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`);
    }
    console.log('  ───────────────────────────────');
    console.log(`  NETTO:                  €${netBalance.toFixed(2)}`);
    console.log('═══════════════════════════════');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Errore:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
