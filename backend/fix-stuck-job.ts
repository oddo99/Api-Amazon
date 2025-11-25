import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const result = await prisma.syncJob.updateMany({
    where: {
      accountId: 'cmggmot2a0005g9362659z7xx',
      status: 'running'
    },
    data: {
      status: 'failed',
      completedAt: new Date(),
      error: 'Timeout or title too long (fixed schema)'
    }
  });

  console.log(`✅ Updated ${result.count} stuck jobs`);
}

fix().then(() => process.exit(0)).catch(console.error);
