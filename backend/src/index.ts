import express from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './api/routes';
import authRoutes from './api/auth.routes';
import clientsRoutes from './api/clients.routes';
import userRoutes from './api/user.routes';
import adminRoutes from './api/admin.routes';
import { scheduleJobs } from './jobs/sync.jobs';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', routes);
app.use('/api', clientsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'Sellerboard Clone API',
    status: 'active',
    version: '1.0.0'
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);

  // Initialize sync jobs for all accounts
  try {
    const accounts = await prisma.account.findMany();

    if (accounts.length > 0) {
      console.log(`\nInitializing sync jobs for ${accounts.length} account(s)...`);

      try {
        for (const account of accounts) {
          scheduleJobs(account.id, account.sellerId);
        }
        console.log('✅ Sync jobs scheduled successfully');
        console.log('   Automatic syncing enabled with Redis\n');
      } catch (redisError) {
        console.log('⚠️  Redis not available - background sync jobs disabled');
        console.log('   Use manual sync from the app\n');
      }
    } else {
      console.log('\n⚠️  No accounts found. Please add an Amazon account to start syncing.\n');
    }
  } catch (error) {
    console.error('Error initializing:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});
