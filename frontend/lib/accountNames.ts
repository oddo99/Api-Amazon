// Mappa gli ID dei seller Amazon ai nomi visualizzabili
const SELLER_NAMES: Record<string, string> = {
  'A1JIEK7HZ5YRL': 'Grifos',
  'A31DH0MV4B261N': 'Valenti',
  // Aggiungi qui altri mapping se necessario
};

/**
 * Ottiene il nome visualizzabile per un sellerId
 * Se non c'è un mapping specifico, ritorna il sellerId originale
 */
export function getSellerDisplayName(sellerId: string): string {
  return SELLER_NAMES[sellerId] || sellerId;
}

/**
 * Verifica se un sellerId ha un nome personalizzato
 */
export function hasCustomSellerName(sellerId: string): boolean {
  return sellerId in SELLER_NAMES;
}
