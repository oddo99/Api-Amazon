import { PrismaClient } from '@prisma/client';
import OrderService from './src/services/order.service';
import FinanceService from './src/services/finance.service';
import InventoryService from './src/services/inventory.service';

const prisma = new PrismaClient();

async function forceSyncValenti() {
  try {
    // Get Valenti account
    const valenti = await prisma.account.findUnique({
      where: { sellerId: 'A31DH0MV4B261N' }
    });

    if (!valenti) {
      console.error('❌ Account Valenti non trovato!');
      return;
    }

    console.log(`\n🔄 Avvio sincronizzazione completa per ${valenti.name}`);
    console.log(`   Account ID: ${valenti.id}`);
    console.log(`   Seller ID: ${valenti.sellerId}`);
    console.log(`   Marketplace: ${valenti.marketplaceId}\n`);

    // 1. Sync Orders (730 days)
    console.log('📦 1. Sincronizzazione ordini (730 giorni)...');
    const orderService = new OrderService(valenti.id, valenti.sellerId);
    const ordersResult = await orderService.syncOrders(valenti.id, 730, valenti.sellerId);
    console.log(`✅ Ordini sincronizzati: ${ordersResult.ordersProcessed}\n`);

    // 2. Sync Finances (730 days)
    console.log('💰 2. Sincronizzazione eventi finanziari (730 giorni)...');
    const financeService = new FinanceService(valenti.id, valenti.sellerId);
    const financeResult = await financeService.syncFinancialEvents(valenti.id, 730, valenti.sellerId);
    console.log(`✅ Eventi finanziari sincronizzati: ${financeResult.eventsProcessed}\n`);

    // 3. Sync Transactions (45 days)
    console.log('💳 3. Sincronizzazione transazioni (45 giorni)...');
    const transactionsResult = await financeService.syncAllTransactions(valenti.id, 45);
    console.log(`✅ Transazioni sincronizzate: ${transactionsResult.transactionsProcessed}\n`);

    // 4. Sync Inventory
    console.log('📊 4. Sincronizzazione inventario...');
    const inventoryService = new InventoryService(valenti.id, valenti.sellerId);
    const inventoryResult = await inventoryService.syncInventory(valenti.id, valenti.sellerId);
    console.log(`✅ Inventario sincronizzato: ${inventoryResult.inventoriesProcessed}\n`);

    console.log('🎉 Sincronizzazione completata con successo!');

  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceSyncValenti();
