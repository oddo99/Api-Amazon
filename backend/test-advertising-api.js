// Test Amazon Advertising API access
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdvertisingAccess() {
  const accountId = 'cmggmot2a0005g9362659z7xx';

  console.log('=== TESTING AMAZON ADVERTISING API ACCESS ===\n');

  try {
    // Import the service
    const { AdvertisingService } = await import('./src/services/advertising.service.js');

    const adService = new AdvertisingService(accountId);

    console.log('Step 1: Getting advertising profiles...');
    const profiles = await adService.getProfiles();

    console.log(`\n✅ Access successful! Found ${profiles.length} profile(s):\n`);

    profiles.forEach((profile, index) => {
      console.log(`Profile ${index + 1}:`);
      console.log(`  Profile ID: ${profile.profileId}`);
      console.log(`  Type: ${profile.accountInfo?.type || 'N/A'}`);
      console.log(`  Marketplace: ${profile.accountInfo?.marketplaceStringId || 'N/A'}`);
      console.log(`  Name: ${profile.accountInfo?.name || 'N/A'}`);
      console.log(`  Valid Payment: ${profile.accountInfo?.validPaymentMethod ? 'Yes' : 'No'}`);
      console.log('');
    });

    if (profiles.length > 0) {
      const profileId = profiles[0].profileId;
      console.log(`\nStep 2: Getting campaigns for profile ${profileId}...`);

      const campaigns = await adService.getCampaigns(profileId.toString());
      console.log(`\n✅ Found ${campaigns.length} campaign(s)\n`);

      if (campaigns.length > 0) {
        console.log('Sample campaigns:');
        campaigns.slice(0, 3).forEach(c => {
          console.log(`  • ${c.name} (${c.state}) - Budget: ${c.dailyBudget || 'N/A'}`);
        });
      }

      console.log('\n✅ Amazon Advertising API is fully accessible!');
      console.log('\nNext steps:');
      console.log('  1. Run sync to import campaign data');
      console.log('  2. Request reports to get metrics (impressions, clicks, spend, etc.)');
    } else {
      console.log('⚠️  No advertising profiles found.');
      console.log('   This account may not have advertising campaigns enabled.');
    }

  } catch (error) {
    console.error('\n❌ Error accessing Advertising API:');
    console.error('   ' + error.message);

    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 This likely means:');
      console.log('   - The account doesn\'t have advertising API permissions');
      console.log('   - Or advertising campaigns are not enabled for this account');
      console.log('   - Check if you have active Sponsored Products campaigns in Seller Central');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testAdvertisingAccess().catch(console.error);
