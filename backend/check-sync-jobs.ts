import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const jobs = await prisma.syncJob.findMany({
    where: { accountId: 'cmggmot2a0005g9362659z7xx' },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\n📋 Ultimi 10 sync jobs:\n');
  jobs.forEach(job => {
    const started = job.startedAt?.toISOString().split('T')[1].split('.')[0];
    const completed = job.completedAt?.toISOString().split('T')[1].split('.')[0];
    const duration = job.startedAt && job.completedAt
      ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
      : '?';

    console.log(`${job.jobType.padEnd(10)} | ${job.status.padEnd(10)} | ${started} | ${duration}s | ${job.recordsProcessed || 0} records`);
    if (job.error) {
      console.log(`  Error: ${job.error}\n`);
    }
  });
}

check().then(() => process.exit(0)).catch(console.error);
