const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAccount() {
  try {
    // Verifica se l'account esiste già
    const existing = await prisma.account.findFirst({
      where: { sellerId: 'A1JIEK7HZ5YRL' }
    });

    if (existing) {
      console.log('✅ Account già esistente. Aggiorno il refresh token...');
      const updated = await prisma.account.update({
        where: { id: existing.id },
        data: {
          refreshToken: process.env.AMAZON_REFRESH_TOKEN,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      console.log('✅ Account aggiornato:', updated.id);
    } else {
      console.log('🔄 Creazione nuovo account...');
      const account = await prisma.account.create({
        data: {
          sellerId: 'A1JIEK7HZ5YRL',
          marketplaceId: process.env.AMAZON_MARKETPLACE_ID,
          accessToken: '',
          refreshToken: process.env.AMAZON_REFRESH_TOKEN,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          region: process.env.AMAZON_REGION,
        }
      });
      console.log('✅ Account creato:', account.id);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Seller ID: A1JIEK7HZ5YRL');
    console.log('Region:', process.env.AMAZON_REGION);
    console.log('Marketplace:', process.env.AMAZON_MARKETPLACE_ID);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAccount();
