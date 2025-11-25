import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'mysql://root:root@localhost:8889/sellerboard',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },

  amazon: {
    clientId: process.env.AMAZON_CLIENT_ID || '',
    clientSecret: process.env.AMAZON_CLIENT_SECRET || '',
    refreshToken: process.env.AMAZON_REFRESH_TOKEN || '',
    region: process.env.AMAZON_REGION || 'na', // na, eu, fe
    marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER', // US marketplace
  },

  oauth: {
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/auth/amazon/callback',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  sync: {
    ordersInterval: parseInt(process.env.SYNC_ORDERS_INTERVAL || '300000'), // 5 minutes
    financesInterval: parseInt(process.env.SYNC_FINANCES_INTERVAL || '600000'), // 10 minutes
    inventoryInterval: parseInt(process.env.SYNC_INVENTORY_INTERVAL || '900000'), // 15 minutes
  },
};
