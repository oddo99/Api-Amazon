import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        accountAccess: {
          include: {
            account: {
              select: {
                id: true,
                sellerId: true,
                marketplaceId: true,
                region: true,
              },
            },
          },
        },
        ownedAccounts: {
          select: {
            id: true,
            sellerId: true,
            marketplaceId: true,
            region: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format response with account access
    const formattedUsers = users.map(user => ({
      ...user,
      accounts: [
        ...user.ownedAccounts,
        ...user.accountAccess.map(a => a.account),
      ],
      ownedAccounts: undefined,
      accountAccess: undefined,
    }));

    res.json(formattedUsers);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { email, password, name, role, accountIds } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'name']
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with account access if provided
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'user',
        // Create account access relations if accountIds provided
        ...(accountIds && accountIds.length > 0 ? {
          accountAccess: {
            create: accountIds.map((accountId: string) => ({
              accountId,
            })),
          },
        } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        accountAccess: {
          include: {
            account: {
              select: {
                id: true,
                sellerId: true,
                marketplaceId: true,
                region: true,
              },
            },
          },
        },
      },
    });

    console.log(`✅ Admin created new user: ${user.email} (${user.role})${accountIds && accountIds.length > 0 ? ` with ${accountIds.length} account(s)` : ''}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        ...user,
        accounts: user.accountAccess.map(a => a.account),
        accountAccess: undefined,
      },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/admin/users/:userId
 * Update a user (admin only)
 */
router.put('/users/:userId', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, password } = req.body;

    // Build update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user (admin only)
 */
router.delete('/users/:userId', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting yourself
    if (userId === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`🗑️  Admin deleted user: ${userId}`);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * POST /api/admin/users/:userId/accounts/:accountId
 * Grant user access to an account (admin only)
 */
router.post('/users/:userId/accounts/:accountId', async (req: AuthRequest, res) => {
  try {
    const { userId, accountId } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if account exists
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if access already exists
    const existingAccess = await prisma.userAccountAccess.findFirst({
      where: {
        userId,
        accountId,
      },
    });

    if (existingAccess) {
      return res.status(409).json({ error: 'User already has access to this account' });
    }

    // Grant access
    const access = await prisma.userAccountAccess.create({
      data: {
        userId,
        accountId,
      },
    });

    console.log(`✅ Admin granted user ${user.email} access to account ${account.sellerId}`);

    res.status(201).json({
      success: true,
      message: 'Account access granted',
      access,
    });
  } catch (error: any) {
    console.error('Grant access error:', error);
    res.status(500).json({ error: 'Failed to grant account access' });
  }
});

/**
 * DELETE /api/admin/users/:userId/accounts/:accountId
 * Revoke user access to an account (admin only)
 */
router.delete('/users/:userId/accounts/:accountId', async (req: AuthRequest, res) => {
  try {
    const { userId, accountId } = req.params;

    // Find and delete access
    const access = await prisma.userAccountAccess.findFirst({
      where: {
        userId,
        accountId,
      },
    });

    if (!access) {
      return res.status(404).json({ error: 'Access not found' });
    }

    await prisma.userAccountAccess.delete({
      where: { id: access.id },
    });

    console.log(`🗑️  Admin revoked user access to account`);

    res.json({
      success: true,
      message: 'Account access revoked',
    });
  } catch (error: any) {
    console.error('Revoke access error:', error);
    res.status(500).json({ error: 'Failed to revoke account access' });
  }
});

/**
 * GET /api/admin/users/:userId/accounts
 * Get all accounts a user has access to (admin only)
 */
router.get('/users/:userId/accounts', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accountAccess: {
          include: {
            account: true,
          },
        },
        ownedAccounts: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accounts = [
      ...user.ownedAccounts,
      ...user.accountAccess.map(a => a.account),
    ];

    res.json(accounts);
  } catch (error: any) {
    console.error('Get user accounts error:', error);
    res.status(500).json({ error: 'Failed to get user accounts' });
  }
});

export default router;
