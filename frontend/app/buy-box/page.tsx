'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import BuyBoxMonitor from '@/components/analytics/BuyBoxMonitor';

export default function BuyBoxPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [buyBoxData, setBuyBoxData] = useState<any[]>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const [availableMarketplaces, setAvailableMarketplaces] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>('buybox-asc');

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Initialize account
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const initAccount = async () => {
      try {
        const accounts = await api.getAccounts() as any[];
        if (accounts.length === 0) {
          console.warn('No accounts found');
          setLoading(false);
          return;
        }
        const firstAccountId = accounts[0].id;
        setAccountId(firstAccountId);

        // Load initial data
        await loadData(firstAccountId);
      } catch (error: any) {
        console.error('Error initializing account:', error);
        setLoading(false);
      }
    };

    initAccount();
  }, [isAuthenticated, authLoading]);

  // Reload when filters change
  useEffect(() => {
    if (accountId && accountId.trim() !== '') {
      loadData(accountId);
    }
  }, [selectedMarketplace, sortBy]);

  const loadData = async (targetAccountId: string) => {
    try {
      setLoading(true);

      const [buyBoxResponse, marketplaces] = await Promise.all([
        api.getBuyBoxData(targetAccountId, {
          marketplaceId: selectedMarketplace || undefined,
          sortBy: sortBy || undefined,
        }),
        api.getAnalyticsMarketplaces(targetAccountId),
      ]) as [any[], any[]];

      setBuyBoxData(buyBoxResponse);
      setAvailableMarketplaces(marketplaces);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading Buy Box data:', error);
      setLoading(false);
    }
  };

  // Loading state
  if (authLoading || (loading && buyBoxData.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento Buy Box Monitor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!accountId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No account found. Please connect an Amazon account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <a href="/" className="text-orange-600 hover:text-orange-700 text-sm mb-1 block">
                ← Torna alla Dashboard
              </a>
              <h1 className="text-2xl font-bold text-gray-900">Buy Box Monitor</h1>
              <p className="text-sm text-gray-500 mt-1">
                Monitora la percentuale di Buy Box per tutti i tuoi prodotti
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              {/* Marketplace Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Mercato:</label>
                <select
                  value={selectedMarketplace}
                  onChange={(e) => setSelectedMarketplace(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Tutti i Mercati</option>
                  {availableMarketplaces.map((marketplace) => (
                    <option key={marketplace.marketplaceId} value={marketplace.marketplaceId}>
                      {marketplace.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Prodotti e Buy Box Performance
              </h2>
              {!loading && buyBoxData.length > 0 && (
                <span className="text-sm text-gray-500">
                  {buyBoxData.length} prodotti
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            <BuyBoxMonitor
              data={buyBoxData}
              loading={loading}
              onSort={(newSortBy) => setSortBy(newSortBy)}
            />
          </div>
        </div>

        {/* Info Box */}
        {buyBoxData.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Cos'è la Buy Box?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    La Buy Box è il riquadro "Aggiungi al carrello" che appare sulla pagina del prodotto su Amazon.
                    Vincere la Buy Box è essenziale per massimizzare le vendite. Amazon assegna la Buy Box in base a:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Prezzo competitivo</li>
                    <li>Disponibilità del prodotto</li>
                    <li>Tempo di spedizione</li>
                    <li>Feedback del venditore e performance</li>
                    <li>Tempo di gestione dell'ordine</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
