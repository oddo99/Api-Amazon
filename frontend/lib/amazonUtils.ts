// Mappa i marketplace ID ai domini Amazon
const MARKETPLACE_DOMAINS: Record<string, string> = {
  'APJ6JRA9NG5V4': 'amazon.it',      // Italy
  'A1PA6795UKMFR9': 'amazon.de',     // Germany
  'A13V1IB3VIYZZH': 'amazon.fr',     // France
  'A1RKKUPIHCS9HS': 'amazon.es',     // Spain
  'A1F83G8C2ARO7P': 'amazon.co.uk',  // UK
  'A1805IZSGTT6HS': 'amazon.nl',     // Netherlands
  'A2NODRKZP88ZB9': 'amazon.se',     // Sweden
  'A1C3SOZRARQ6R3': 'amazon.pl',     // Poland
  'ARBP9OOSHTCHU': 'amazon.eg',      // Egypt
  'A33AVAJ2PDY3EV': 'amazon.com.tr', // Turkey
  'A19VAU5U5O7RUS': 'amazon.sg',     // Singapore
  'A39IBJ37TRP1C6': 'amazon.com.au', // Australia
  'A1VC38T7YXB528': 'amazon.co.jp',  // Japan
  'ATVPDKIKX0DER': 'amazon.com',     // US
  'A2EUQ1WTGCTBG2': 'amazon.ca',     // Canada
  'A2Q3Y263D00KWC': 'amazon.com.br', // Brazil
  'A1AM78C64UM0Y8': 'amazon.com.mx', // Mexico
};

// Mappa i marketplace ID ai codici paese per le bandiere
const MARKETPLACE_COUNTRIES: Record<string, string> = {
  'APJ6JRA9NG5V4': 'IT',      // Italy
  'A1PA6795UKMFR9': 'DE',     // Germany
  'A13V1IB3VIYZZH': 'FR',     // France
  'A1RKKUPIHCS9HS': 'ES',     // Spain
  'A1F83G8C2ARO7P': 'GB',     // UK
  'A1805IZSGTT6HS': 'NL',     // Netherlands
  'A2NODRKZP88ZB9': 'SE',     // Sweden
  'A1C3SOZRARQ6R3': 'PL',     // Poland
  'ARBP9OOSHTCHU': 'EG',      // Egypt
  'A33AVAJ2PDY3EV': 'TR',     // Turkey
  'A19VAU5U5O7RUS': 'SG',     // Singapore
  'A39IBJ37TRP1C6': 'AU',     // Australia
  'A1VC38T7YXB528': 'JP',     // Japan
  'ATVPDKIKX0DER': 'US',      // US
  'A2EUQ1WTGCTBG2': 'CA',     // Canada
  'A2Q3Y263D00KWC': 'BR',     // Brazil
  'A1AM78C64UM0Y8': 'MX',     // Mexico
};

/**
 * Ottiene il dominio Amazon dal marketplace ID
 */
export function getAmazonDomain(marketplaceId: string): string {
  return MARKETPLACE_DOMAINS[marketplaceId] || 'amazon.com';
}

/**
 * Genera l'URL della pagina prodotto Amazon
 */
export function getAmazonProductUrl(asin: string, marketplaceId: string): string {
  const domain = getAmazonDomain(marketplaceId);
  return `https://www.${domain}/dp/${asin}`;
}

/**
 * Ottiene il codice paese dal marketplace ID (per le emoji bandiera)
 */
export function getCountryCode(marketplaceId: string): string {
  return MARKETPLACE_COUNTRIES[marketplaceId] || 'XX';
}

/**
 * Ottiene l'emoji bandiera dal marketplace ID
 */
export function getCountryFlag(marketplaceId: string): string {
  const countryCode = getCountryCode(marketplaceId);
  // Convert country code to flag emoji
  // Each letter is offset by 0x1F1E6 from 'A' (0x41)
  if (countryCode === 'XX') return '🌐';

  const codePoints = countryCode
    .split('')
    .map(char => 0x1F1E6 + char.charCodeAt(0) - 65);

  return String.fromCodePoint(...codePoints);
}

/**
 * Lista dei marketplace comuni per il filtro
 */
export const COMMON_MARKETPLACES = [
  { id: 'APJ6JRA9NG5V4', name: 'Italia', flag: '🇮🇹' },
  { id: 'A1PA6795UKMFR9', name: 'Germania', flag: '🇩🇪' },
  { id: 'A13V1IB3VIYZZH', name: 'Francia', flag: '🇫🇷' },
  { id: 'A1RKKUPIHCS9HS', name: 'Spagna', flag: '🇪🇸' },
  { id: 'A1F83G8C2ARO7P', name: 'Regno Unito', flag: '🇬🇧' },
  { id: 'A1805IZSGTT6HS', name: 'Paesi Bassi', flag: '🇳🇱' },
];
