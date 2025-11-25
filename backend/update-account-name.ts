import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAccountName() {
  try {
    console.log('🔄 Aggiornamento nome account...');
    
    const account = await prisma.account.update({
      where: {
        sellerId: 'A31DH0MV4B261N'
      },
      data: {
        name: 'Valenti'
      }
    });
    
    console.log('✅ Account aggiornato:', account);
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAccountName();
