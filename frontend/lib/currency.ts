// Currency conversion utility
// Exchange rates (update periodically or fetch from API)
const EXCHANGE_RATES: Record<string, number> = {
  EUR: 1.0,
  USD: 0.92, // 1 USD = 0.92 EUR (approximate)
  GBP: 1.16, // 1 GBP = 1.16 EUR (approximate)
};

export function convertToEUR(amount: number, fromCurrency: string = 'EUR'): number {
  const rate = EXCHANGE_RATES[fromCurrency] || 1.0;
  return amount * rate;
}

export function formatEUR(amount: number, fromCurrency: string = 'EUR'): string {
  const eurAmount = convertToEUR(amount, fromCurrency);
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(eurAmount);
}

// Marketplace info
export interface MarketplaceInfo {
  id: string;
  name: string;
  currency: string;
  flag: string;
}

export const MARKETPLACES: Record<string, MarketplaceInfo> = {
  // Official Amazon Marketplace IDs
  'ATVPDKIKX0DER': { id: 'ATVPDKIKX0DER', name: 'Stati Uniti', currency: 'USD', flag: '🇺🇸' },
  'A2EUQ1WTGCTBG2': { id: 'A2EUQ1WTGCTBG2', name: 'Canada', currency: 'CAD', flag: '🇨🇦' },
  'A1AM78C64UM0Y8': { id: 'A1AM78C64UM0Y8', name: 'Messico', currency: 'MXN', flag: '🇲🇽' },
  'A2Q3Y263D00KWC': { id: 'A2Q3Y263D00KWC', name: 'Brasile', currency: 'BRL', flag: '🇧🇷' },
  'A1F83G8C2ARO7P': { id: 'A1F83G8C2ARO7P', name: 'Regno Unito', currency: 'GBP', flag: '🇬🇧' },
  'A1PA6795UKMFR9': { id: 'A1PA6795UKMFR9', name: 'Germania', currency: 'EUR', flag: '🇩🇪' },
  'A13V1IB3VIYZZH': { id: 'A13V1IB3VIYZZH', name: 'Francia', currency: 'EUR', flag: '🇫🇷' },
  'APJ6JRA9NG5V4': { id: 'APJ6JRA9NG5V4', name: 'Italia', currency: 'EUR', flag: '🇮🇹' },
  'A1RKKUPIHCS9HS': { id: 'A1RKKUPIHCS9HS', name: 'Spagna', currency: 'EUR', flag: '🇪🇸' },
  'A1805IZSGTT6HS': { id: 'A1805IZSGTT6HS', name: 'Paesi Bassi', currency: 'EUR', flag: '🇳🇱' },
  'A1VC38T7YXB528': { id: 'A1VC38T7YXB528', name: 'Giappone', currency: 'JPY', flag: '🇯🇵' },
  'A39IBJ37TRP1C6': { id: 'A39IBJ37TRP1C6', name: 'Australia', currency: 'AUD', flag: '🇦🇺' },
  'A19VAU5U5O7RUS': { id: 'A19VAU5U5O7RUS', name: 'Singapore', currency: 'SGD', flag: '🇸🇬' },
  // Legacy formats (for backwards compatibility)
  'amazon.it': { id: 'amazon.it', name: 'Italia', currency: 'EUR', flag: '🇮🇹' },
  'Amazon.it': { id: 'Amazon.it', name: 'Italia', currency: 'EUR', flag: '🇮🇹' },
  'amazon.de': { id: 'amazon.de', name: 'Germania', currency: 'EUR', flag: '🇩🇪' },
  'Amazon.de': { id: 'Amazon.de', name: 'Germania', currency: 'EUR', flag: '🇩🇪' },
  'amazon.fr': { id: 'amazon.fr', name: 'Francia', currency: 'EUR', flag: '🇫🇷' },
  'Amazon.fr': { id: 'Amazon.fr', name: 'Francia', currency: 'EUR', flag: '🇫🇷' },
  'amazon.es': { id: 'amazon.es', name: 'Spagna', currency: 'EUR', flag: '🇪🇸' },
  'Amazon.es': { id: 'Amazon.es', name: 'Spagna', currency: 'EUR', flag: '🇪🇸' },
  'amazon.co.uk': { id: 'amazon.co.uk', name: 'Regno Unito', currency: 'GBP', flag: '🇬🇧' },
  'Amazon.co.uk': { id: 'Amazon.co.uk', name: 'Regno Unito', currency: 'GBP', flag: '🇬🇧' },
  'amazon.nl': { id: 'amazon.nl', name: 'Paesi Bassi', currency: 'EUR', flag: '🇳🇱' },
  'Amazon.nl': { id: 'Amazon.nl', name: 'Paesi Bassi', currency: 'EUR', flag: '🇳🇱' },
  'amazon.com': { id: 'amazon.com', name: 'Stati Uniti', currency: 'USD', flag: '🇺🇸' },
  'Amazon.com': { id: 'Amazon.com', name: 'Stati Uniti', currency: 'USD', flag: '🇺🇸' },
};

export function getMarketplaceName(marketplaceId: string): string {
  return MARKETPLACES[marketplaceId]?.name || marketplaceId;
}

export function getMarketplaceCurrency(marketplaceId: string): string {
  return MARKETPLACES[marketplaceId]?.currency || 'EUR';
}

export function getMarketplaceFlag(marketplaceId: string): string {
  return MARKETPLACES[marketplaceId]?.flag || '🏳️';
}
