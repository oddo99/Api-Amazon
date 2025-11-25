// Update Amazon refresh token for an account
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  if (process.argv.length < 4) {
    console.error('Usage: node update-token.js <accountId> <newRefreshToken>');
    process.exit(1);
  }

  const accountId = process.argv[2];
  const newRefreshToken = process.argv[3];

  console.log(`Updating refresh token for account ${accountId}...`);

  try {
    const account = await prisma.account.update({
      where: { id: accountId },
      data: {
        refreshToken: newRefreshToken,
        // Set expiry to current time so it will refresh immediately
        expiresAt: new Date(),
      },
    });

    console.log('✅ Refresh token updated successfully!');
    console.log(`Account: ${account.sellerId}`);
    console.log(`Marketplace: ${account.marketplaceId}`);
    console.log(`Region: ${account.region}`);
  } catch (error) {
    console.error('❌ Failed to update token:', error.message);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
