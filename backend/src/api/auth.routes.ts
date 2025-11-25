import { Router } from 'express';
import axios from 'axios';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import SellingPartnerAPI from 'amazon-sp-api';

const router = Router();
const prisma = new PrismaClient();

// Store state tokens temporarily (in production use Redis)
const stateTokens = new Map<string, { timestamp: number; mode?: string }>();

/**
 * OAuth Flow - Step 1: Redirect to Amazon Authorization
 *
 * User clicks "Connect Amazon" → Redirects to Amazon Seller Central
 * Query param: mode=get_token (optional) - if set, will return token instead of saving
 */
router.get('/amazon/authorize', (req, res) => {
  try {
    const mode = req.query.mode as string; // 'get_token' or undefined

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    stateTokens.set(state, { timestamp: Date.now(), mode });

    // Clean old state tokens (older than 10 minutes)
    cleanExpiredStates();

    // Build Amazon authorization URL
    const authUrl =
      `https://sellercentral.amazon.com/apps/authorize/consent` +
      `?application_id=${config.amazon.clientId}` +
      `&state=${state}` +
      `&redirect_uri=${encodeURIComponent(config.oauth.redirectUri)}` +
      `&version=beta`;

    console.log('📤 Redirecting to Amazon for authorization...');
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate authorization' });
  }
});

/**
 * OAuth Flow - Step 2: Handle Amazon Callback
 *
 * Amazon redirects back with authorization code
 * Exchange code for refresh_token and save to database
 */
router.get('/amazon/callback', async (req, res) => {
  const { spapi_oauth_code, state, selling_partner_id } = req.query;

  console.log('📥 Received callback from Amazon');

  // Validate state (CSRF protection)
  if (!state || !stateTokens.has(state as string)) {
    console.error('❌ Invalid state token');
    return res.redirect(`${config.oauth.frontendUrl}?auth=error&reason=invalid_state`);
  }

  const stateData = stateTokens.get(state as string);
  const mode = stateData?.mode;
  stateTokens.delete(state as string);

  // Validate authorization code
  if (!spapi_oauth_code) {
    console.error('❌ No authorization code received');
    return res.redirect(`${config.oauth.frontendUrl}?auth=error&reason=no_code`);
  }

  try {
    console.log('🔄 Exchanging authorization code for tokens...');

    // Exchange authorization code for tokens
    const tokenResponse = await axios.post(
      'https://api.amazon.com/auth/o2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: spapi_oauth_code as string,
        client_id: config.amazon.clientId,
        client_secret: config.amazon.clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { refresh_token, access_token, expires_in } = tokenResponse.data;

    console.log('✅ Tokens received successfully');

    // If mode is 'get_token', just return the tokens to the user
    if (mode === 'get_token') {
      console.log('🔑 Get token mode - redirecting to token display page');
      return res.redirect(
        `${config.oauth.frontendUrl}/login/token-received?` +
        `refresh_token=${encodeURIComponent(refresh_token)}` +
        `&client_id=${encodeURIComponent(config.amazon.clientId)}` +
        `&client_secret=${encodeURIComponent(config.amazon.clientSecret)}` +
        `&seller_id=${encodeURIComponent(selling_partner_id as string)}`
      );
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Check if account already exists
    const existingAccount = await prisma.account.findFirst({
      where: { sellerId: selling_partner_id as string },
    });

    let account;

    if (existingAccount) {
      // Update existing account
      console.log('🔄 Updating existing account...');
      account = await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new account
      console.log('➕ Creating new account...');
      account = await prisma.account.create({
        data: {
          sellerId: selling_partner_id as string,
          marketplaceId: config.amazon.marketplaceId,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
          region: config.amazon.region,
        },
      });
    }

    console.log(`✅ Account saved: ${account.id}`);
    console.log('🎉 Authorization complete!');

    // Redirect back to frontend with success
    res.redirect(`${config.oauth.frontendUrl}?auth=success&account_id=${account.id}`);
  } catch (error: any) {
    console.error('❌ OAuth error:', error.response?.data || error.message);

    // Redirect to frontend with error
    res.redirect(`${config.oauth.frontendUrl}?auth=error&reason=token_exchange_failed`);
  }
});

/**
 * Check if account is authorized
 */
router.get('/status', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        sellerId: true,
        marketplaceId: true,
        region: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    res.json({
      authorized: accounts.length > 0,
      accounts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Revoke authorization (disconnect account)
 */
router.delete('/amazon/revoke/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    await prisma.account.delete({
      where: { id: accountId },
    });

    console.log(`🗑️  Account ${accountId} disconnected`);

    res.json({ success: true, message: 'Account disconnected' });
  } catch (error: any) {
    console.error('Error revoking authorization:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Direct Login - Login with Amazon SP-API credentials
 *
 * User provides their Amazon SP-API credentials directly
 */
router.post('/amazon/credentials', async (req, res) => {
  const {
    sellerId,
    clientId,
    clientSecret,
    refreshToken,
    region,
    marketplaceId
  } = req.body;

  console.log('📥 Received direct login request');

  // Validate required fields
  if (!sellerId || !clientId || !clientSecret || !refreshToken || !region || !marketplaceId) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['sellerId', 'clientId', 'clientSecret', 'refreshToken', 'region', 'marketplaceId']
    });
  }

  try {
    console.log('🔄 Validating Amazon SP-API credentials...');

    // Test the credentials by making a simple API call
    const testClient = new (SellingPartnerAPI as any)({
      region: region,
      refresh_token: refreshToken,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: clientId,
        SELLING_PARTNER_APP_CLIENT_SECRET: clientSecret,
      },
    });

    // Try to make a test API call to validate credentials
    try {
      await testClient.callAPI({
        operation: 'getMarketplaceParticipations',
        endpoint: 'sellers',
      });
      console.log('✅ Credentials validated successfully');
    } catch (apiError: any) {
      console.error('❌ Invalid Amazon SP-API credentials:', apiError.message);
      return res.status(401).json({
        error: 'Invalid Amazon SP-API credentials',
        details: 'Unable to authenticate with Amazon. Please check your credentials.'
      });
    }

    // Calculate token expiry (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Check if account already exists
    const existingAccount = await prisma.account.findFirst({
      where: { sellerId: sellerId },
    });

    let account;

    if (existingAccount) {
      // Update existing account
      console.log('🔄 Updating existing account...');
      account = await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: '', // Will be generated by SDK
          refreshToken: refreshToken,
          expiresAt,
          marketplaceId,
          region,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new account
      console.log('➕ Creating new account...');
      account = await prisma.account.create({
        data: {
          sellerId: sellerId,
          marketplaceId: marketplaceId,
          accessToken: '', // Will be generated by SDK
          refreshToken: refreshToken,
          expiresAt,
          region: region,
        },
      });
    }

    console.log(`✅ Account saved: ${account.id}`);
    console.log('🎉 Login complete!');

    res.json({
      success: true,
      message: 'Account connected successfully',
      account: {
        id: account.id,
        sellerId: account.sellerId,
        marketplaceId: account.marketplaceId,
        region: account.region,
      },
    });
  } catch (error: any) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({
      error: 'Failed to connect account',
      details: error.message
    });
  }
});

/**
 * Clean expired state tokens (older than 10 minutes)
 */
function cleanExpiredStates() {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;

  for (const [state, data] of stateTokens.entries()) {
    if (now - data.timestamp > tenMinutes) {
      stateTokens.delete(state);
    }
  }
}

export default router;
