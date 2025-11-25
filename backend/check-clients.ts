import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkClients() {
  try {
    const account = await prisma.account.findFirst({
      where: { sellerId: 'A31DH0MV4B261N' },
      include: { clients: true }
    });
    
    console.log('Account:', {
      id: account?.id,
      name: account?.name,
      sellerId: account?.sellerId,
      isSolutionProvider: account?.isSolutionProvider,
      clients: account?.clients
    });
  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClients();
