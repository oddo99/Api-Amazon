import { PrismaClient } from '@prisma/client';
import SPAPIService from './src/services/spapi.service';

const prisma = new PrismaClient();

// Mapping marketplace ID to locale
const MARKETPLACE_LOCALES: Record<string, string> = {
  'APJ6JRA9NG5V4': 'it_IT',      // Italy
  'A1PA6795UKMFR9': 'de_DE',     // Germany
  'A13V1IB3VIYZZH': 'fr_FR',     // France
  'A1RKKUPIHCS9HS': 'es_ES',     // Spain
  'A1F83G8C2ARO7P': 'en_GB',     // UK
  'A1805IZSGTT6HS': 'nl_NL',     // Netherlands
};

const MARKETPLACE_NAMES: Record<string, string> = {
  'APJ6JRA9NG5V4': 'Italia',
  'A1PA6795UKMFR9': 'Germania',
  'A13V1IB3VIYZZH': 'Francia',
  'A1RKKUPIHCS9HS': 'Spagna',
  'A1F83G8C2ARO7P': 'Regno Unito',
  'A1805IZSGTT6HS': 'Paesi Bassi',
};

async function syncLocalizedTitles() {
  try {
    console.log('🌍 Sincronizzazione titoli localizzati dai prodotti Amazon...\n');

    // Get account
    const account = await prisma.account.findFirst();
    if (!account) {
      console.error('❌ Nessun account trovato');
      return;
    }

    console.log(`📦 Account: ${account.sellerId}\n`);

    // Get all unique ASINs with their marketplaces
    const products = await prisma.product.groupBy({
      by: ['asin', 'marketplaceId'],
      where: {
        marketplaceId: { not: null },
      },
    });

    console.log(`📊 Trovati ${products.length} prodotti unici da aggiornare\n`);

    let updated = 0;
    let errors = 0;

    const spapi = new SPAPIService(account.id);

    for (const product of products) {
      if (!product.marketplaceId) continue;

      const locale = MARKETPLACE_LOCALES[product.marketplaceId];
      const marketplaceName = MARKETPLACE_NAMES[product.marketplaceId] || product.marketplaceId;

      if (!locale) {
        console.log(`⚠️  Locale non trovato per ${product.marketplaceId}, skip ${product.asin}`);
        continue;
      }

      try {
        console.log(`🔄 ${product.asin} [${marketplaceName}]...`);

        // Call Catalog Items API with locale
        const catalogData = await spapi.getCatalogItem(
          product.asin,
          [product.marketplaceId],
          locale
        );

        // Extract localized title from response
        const localizedTitle = catalogData?.summaries?.[0]?.itemName ||
                             catalogData?.summaries?.[0]?.title ||
                             catalogData?.title;

        if (localizedTitle) {
          // Update all products with this ASIN and marketplaceId
          await prisma.product.updateMany({
            where: {
              asin: product.asin,
              marketplaceId: product.marketplaceId,
            },
            data: {
              title: localizedTitle,
            },
          });

          console.log(`   ✅ ${localizedTitle.substring(0, 60)}...`);
          updated++;
        } else {
          console.log(`   ⚠️  Nessun titolo trovato nella risposta API`);
        }

        // Rate limiting: wait 500ms between requests to avoid throttling
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.log(`   ❌ Errore: ${error.message}`);
        errors++;

        // If rate limited, wait longer
        if (error.message?.includes('429') || error.message?.includes('throttl')) {
          console.log('   ⏳ Rate limit - attendo 5 secondi...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    console.log(`\n✅ Sincronizzazione completata!`);
    console.log(`   Aggiornati: ${updated} prodotti`);
    console.log(`   Errori: ${errors}`);

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncLocalizedTitles();
