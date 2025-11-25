'use client';

import { useState, useEffect, Suspense } from 'react';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

const REGIONS = [
  { value: 'na', label: 'Nord America', description: 'US, CA, MX, BR' },
  { value: 'eu', label: 'Europa', description: 'UK, DE, FR, IT, ES, NL' },
  { value: 'fe', label: 'Far East', description: 'JP, AU, SG' },
];

const MARKETPLACES: Record<string, Array<{ value: string; label: string }>> = {
  na: [
    { value: 'ATVPDKIKX0DER', label: 'United States' },
    { value: 'A2EUQ1WTGCTBG2', label: 'Canada' },
    { value: 'A1AM78C64UM0Y8', label: 'Mexico' },
    { value: 'A2Q3Y263D00KWC', label: 'Brazil' },
  ],
  eu: [
    { value: 'A1F83G8C2ARO7P', label: 'United Kingdom' },
    { value: 'A1PA6795UKMFR9', label: 'Germany' },
    { value: 'A13V1IB3VIYZZH', label: 'France' },
    { value: 'APJ6JRA9NG5V4', label: 'Italy' },
    { value: 'A1RKKUPIHCS9HS', label: 'Spain' },
    { value: 'A1805IZSGTT6HS', label: 'Netherlands' },
  ],
  fe: [
    { value: 'A1VC38T7YXB528', label: 'Japan' },
    { value: 'A39IBJ37TRP1C6', label: 'Australia' },
    { value: 'A19VAU5U5O7RUS', label: 'Singapore' },
  ],
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sellerId: '',
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    region: 'na',
    marketplaceId: 'ATVPDKIKX0DER',
  });

  // Pre-fill form if credentials are provided in URL (from token-received page)
  useEffect(() => {
    const sellerId = searchParams.get('seller_id');
    const clientId = searchParams.get('client_id');
    const clientSecret = searchParams.get('client_secret');
    const refreshToken = searchParams.get('refresh_token');

    if (sellerId || clientId || clientSecret || refreshToken) {
      setFormData(prev => ({
        ...prev,
        sellerId: sellerId || prev.sellerId,
        clientId: clientId || prev.clientId,
        clientSecret: clientSecret || prev.clientSecret,
        refreshToken: refreshToken || prev.refreshToken,
      }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await api.loginWithCredentials(formData);
      console.log('Login successful:', result);

      // Redirect to dashboard
      router.push('/?auth=success');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to connect account. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // If region changes, reset marketplace to first option
      if (field === 'region') {
        updated.marketplaceId = MARKETPLACES[value][0].value;
      }

      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connetti il tuo Account Amazon
          </h1>
          <p className="text-gray-600">
            Inserisci le tue credenziali Amazon SP-API per iniziare
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Info Box */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Come ottenere le credenziali?</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Registra la tua app su <a href="https://developer.amazonservices.com" target="_blank" rel="noopener noreferrer" className="underline">Amazon Developer Central</a> per ottenere Client ID e Secret</li>
                  <li>Clicca "Ottieni via OAuth" nel campo Refresh Token per autenticarti con Amazon</li>
                  <li>Copia tutte le credenziali mostrate e inseriscile nel form</li>
                </ol>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seller ID */}
            <div>
              <label htmlFor="sellerId" className="block text-sm font-medium text-gray-700 mb-2">
                Amazon Seller ID *
              </label>
              <input
                type="text"
                id="sellerId"
                required
                value={formData.sellerId}
                onChange={(e) => handleChange('sellerId', e.target.value)}
                placeholder="es: A2EUQ1WTGCTBG2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <p className="mt-1 text-xs text-gray-500">
                Trovi il tuo Seller ID in Seller Central → Settings → Account Info
              </p>
            </div>

            {/* Region */}
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                Seleziona Regione (Tutti i Marketplace) *
              </label>
              <select
                id="region"
                required
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                {REGIONS.map(region => (
                  <option key={region.value} value={region.value}>
                    {region.label} - {region.description}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Un singolo collegamento ti darà accesso a tutti i marketplace della regione
              </p>
            </div>

            {/* Marketplace Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-1">
                    📍 Marketplace collegati
                  </p>
                  <p className="text-sm text-green-800">
                    Con un singolo collegamento avrai accesso a <strong>TUTTI i marketplace</strong> della regione selezionata:
                  </p>
                  <ul className="mt-2 text-sm text-green-800 space-y-1">
                    {MARKETPLACES[formData.region].map(marketplace => (
                      <li key={marketplace.value} className="flex items-center">
                        <span className="mr-2">✓</span>
                        <span>{marketplace.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-green-700">
                    I dati verranno sincronizzati automaticamente da tutti questi marketplace
                  </p>
                </div>
              </div>
            </div>

            {/* Hidden Marketplace field (using first of region as default) */}
            <input type="hidden" name="marketplaceId" value={formData.marketplaceId} />

            {/* Client ID */}
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                Client ID *
              </label>
              <input
                type="text"
                id="clientId"
                required
                value={formData.clientId}
                onChange={(e) => handleChange('clientId', e.target.value)}
                placeholder="amzn1.application-oa2-client.xxxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
              />
            </div>

            {/* Client Secret */}
            <div>
              <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-2">
                Client Secret *
              </label>
              <input
                type="password"
                id="clientSecret"
                required
                value={formData.clientSecret}
                onChange={(e) => handleChange('clientSecret', e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
              />
            </div>

            {/* Refresh Token */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="refreshToken" className="text-sm font-medium text-gray-700">
                  Refresh Token *
                </label>
                <a
                  href="http://localhost:3001/auth/amazon/authorize?mode=get_token"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Ottieni via OAuth
                </a>
              </div>
              <textarea
                id="refreshToken"
                required
                value={formData.refreshToken}
                onChange={(e) => handleChange('refreshToken', e.target.value)}
                placeholder="Atzr|IwEBIA..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Non hai il Refresh Token? Clicca su "Ottieni via OAuth" per ottenerlo da Amazon
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold">Errore di autenticazione</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connessione in corso...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Connetti Account
                </>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-8 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Sicurezza Garantita
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Le tue credenziali sono salvate in modo sicuro nel tuo database locale</li>
              <li>✓ Accesso READ-ONLY ai tuoi dati Amazon</li>
              <li>✓ Nessuna modifica verrà mai effettuata su Amazon</li>
              <li>✓ Puoi revocare l'accesso in qualsiasi momento</li>
            </ul>
          </div>
        </div>

        {/* Help Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Hai bisogno di aiuto?{' '}
            <a
              href="https://developer-docs.amazon.com/sp-api/docs/registering-your-application"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Guida Amazon SP-API
            </a>
          </p>
          <p className="mt-2">
            <a href="/" className="text-gray-500 hover:text-gray-700">
              ← Torna alla home
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
