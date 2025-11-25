import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Get all clients for a Solution Provider
 */
router.get('/:accountId/clients', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account is a Solution Provider
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        clients: {
          where: { isActive: true },
          orderBy: { sellerName: 'asc' },
        },
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!account.isSolutionProvider) {
      return res.json({
        isSolutionProvider: false,
        clients: [],
      });
    }

    res.json({
      isSolutionProvider: true,
      clients: account.clients,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add a client to a Solution Provider
 */
router.post('/:accountId/clients', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { sellingPartnerId, sellerName, marketplaceId } = req.body;

    if (!sellingPartnerId) {
      return res.status(400).json({ error: 'sellingPartnerId is required' });
    }

    // Verify account is a Solution Provider
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!account.isSolutionProvider) {
      return res.status(403).json({ error: 'This account is not a Solution Provider' });
    }

    // Check if client already exists
    const existingClient = await prisma.clientAccount.findUnique({
      where: { sellingPartnerId },
    });

    if (existingClient) {
      return res.status(409).json({ error: 'Client already exists' });
    }

    // Create client
    const client = await prisma.clientAccount.create({
      data: {
        solutionProviderId: accountId,
        sellingPartnerId,
        sellerName: sellerName || sellingPartnerId,
        marketplaceId: marketplaceId || account.marketplaceId,
      },
    });

    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a client
 */
router.put('/:accountId/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { sellerName, isActive } = req.body;

    const client = await prisma.clientAccount.update({
      where: { id: clientId },
      data: {
        sellerName: sellerName !== undefined ? sellerName : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete/deactivate a client
 */
router.delete('/:accountId/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Soft delete - just mark as inactive
    const client = await prisma.clientAccount.update({
      where: { id: clientId },
      data: { isActive: false },
    });

    res.json({ success: true, client });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark account as Solution Provider
 * This is useful if user authorized as regular account but wants to upgrade
 */
router.post('/:accountId/upgrade-to-solution-provider', async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.account.update({
      where: { id: accountId },
      data: { isSolutionProvider: true },
    });

    res.json({
      success: true,
      message: 'Account upgraded to Solution Provider',
      account,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
