import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.middleware';

const prisma = new PrismaClient();

/**
 * Middleware to verify user has access to the specified account
 * Expects accountId in req.params
 */
export const authorizeAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Admin can access all accounts
    if (user.role === 'admin') {
      return next();
    }

    // Check if user has access to this account
    const access = await prisma.userAccountAccess.findFirst({
      where: {
        userId: user.id,
        accountId: accountId,
      },
    });

    if (!access) {
      return res.status(403).json({ error: 'Access denied to this account' });
    }

    next();
  } catch (error: any) {
    console.error('Authorization error:', error);
    return res.status(500).json({ error: 'Authorization failed' });
  }
};

/**
 * Get list of account IDs the user has access to
 */
export const getUserAccessibleAccounts = async (userId: string, userRole: string): Promise<string[]> => {
  try {
    // Admin can access all accounts
    if (userRole === 'admin') {
      const accounts = await prisma.account.findMany({
        select: { id: true },
      });
      return accounts.map((a: any) => a.id);
    }

    // Regular user - get accounts they have access to
    const access = await prisma.userAccountAccess.findMany({
      where: { userId },
      select: { accountId: true },
    });

    return access.map((a: any) => a.accountId);
  } catch (error) {
    console.error('Error getting accessible accounts:', error);
    return [];
  }
};
