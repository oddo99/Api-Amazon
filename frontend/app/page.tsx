'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import ClientSelector from '@/components/ClientSelector';
import SyncButton from '@/components/SyncButton';
import FiltersBar, { Filters } from '@/components/FiltersBar';
import ProfitOverview from '@/components/dashboard/ProfitOverview';
import DetailedCostBreakdown from '@/components/dashboard/DetailedCostBreakdown';
import MarketplaceComparison from '@/components/dashboard/MarketplaceComparison';
import InventoryStatus from '@/components/dashboard/InventoryStatus';
import TopProducts from '@/components/dashboard/TopProducts';
import ReturnsAnalysis from '@/components/dashboard/ReturnsAnalysis';
import MetricsOverview from '@/components/dashboard/MetricsOverview';

// Default date range: last 30 days
const getDefaultDateRange = () => {
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
    preset: '30',
  };
};

export default function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [costBreakdownData, setCostBreakdownData] = useState<any>(null);
  const [marketplaceStatsData, setMarketplaceStatsData] = useState<any[]>([]);
  const [currentAccount, setCurrentAccount] = useState<any>(null);

  const [filters, setFilters] = useState<Filters>({
    dateRange: getDefaultDateRange(),
    marketplaceIds: [],
    skus: [],
  });

  // Track if filters have been loaded for the first time
  const filtersInitialized = useRef(false);

  // Check authentication first
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Initialize and handle URL accountId parameter
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const urlAccountId = params.get('account');

    console.log('Init useEffect - initialized:', initialized, 'urlAccountId:', urlAccountId, 'currentAccountId:', accountId);

    // Handle successful login message
    if (authStatus === 'success' && !initialized) {
      alert('✅ Account Amazon connesso con successo! Sincronizzazione in corso...');
      window.history.replaceState({}, '', '/');
    }

    // Only run initialization once
    if (initialized) return;

    setInitialized(true);

    // If we have an accountId in the URL, use it
    if (urlAccountId) {
      console.log('Loading data for URL accountId:', urlAccountId);
      setAccountId(urlAccountId);
      setLoading(true);
      loadData(urlAccountId);
    }
    // Otherwise, load the first account
    else {
      console.log('No URL accountId, loading first account...');
      setLoading(true);
      loadData();
    }
  }, [isAuthenticated, authLoading, initialized]);

  // Reload when filters or selectedClient change (but not on first render)
  useEffect(() => {
    // Skip first render - initial data is loaded by the first useEffect
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      return;
    }

    // Only reload if we have an accountId and are already initialized
    if (initialized && accountId && accountId.trim() !== '') {
      console.log('Filters or client changed, reloading data for accountId:', accountId);
      setLoading(true);
      loadData(accountId);
    }
  }, [JSON.stringify(filters), selectedClient]);

  const loadData = async (targetAccountId?: string) => {
    try {
      // Use provided accountId or fall back to state
      const activeAccountId = targetAccountId || accountId;
      console.log('🔍 loadData called with targetAccountId:', targetAccountId, 'current accountId state:', accountId, 'activeAccountId:', activeAccountId);

      // Get first account if not set
      if (!activeAccountId || activeAccountId.trim() === '') {
        console.log('📋 No accountId provided, loading accounts list...');
        const accounts = await api.getAccounts() as any[];
        console.log('📋 Accounts loaded:', accounts.length, 'accounts found');
        if (accounts.length === 0) {
          console.warn('⚠️ No accounts found in database');
          setLoading(false);
          return;
        }
        const firstAccountId = accounts[0].id;
        console.log('✅ Using first account:', firstAccountId, accounts[0].name || accounts[0].sellerId);
        setAccountId(firstAccountId);
        // Immediately load data for the first account
        loadData(firstAccountId);
        return;
      }

      console.log('📦 Loading data for accountId:', activeAccountId);

      // Final validation before API calls
      if (!activeAccountId || activeAccountId.trim() === '') {
        console.error('❌ CRITICAL: activeAccountId is still empty after all checks!');
        setLoading(false);
        return;
      }

      const { startDate, endDate } = filters.dateRange;

      // Load account info first to show badge immediately
      console.log('👤 Fetching account info...');
      let accountInfo;
      try {
        accountInfo = await api.getAccount(activeAccountId) as any;
        console.log('✅ Account info loaded:', accountInfo.name || accountInfo.sellerId, 'ID:', accountInfo.id);
        setCurrentAccount(accountInfo); // Set immediately to show badge
      } catch (error: any) {
        console.error('❌ Error loading account info:', error);
        console.error('   AccountId passed:', activeAccountId);
        console.error('   Error message:', error.message);
        alert(`❌ Errore nel caricamento dell'account: ${error.message || 'Errore sconosciuto'}`);
        setLoading(false);
        return;
      }

      // Load all other data in parallel
      console.log('📊 Fetching dashboard data in parallel...');
      const [
        dashboard,
        dailyData,
        inventory,
        products,
        costBreakdown,
        marketplaceStats,
      ] = await Promise.all([
        api.getDashboard(activeAccountId, {
          startDate,
          endDate,
          marketplaceIds: filters.marketplaceIds.length > 0 ? filters.marketplaceIds : undefined,
          skus: filters.skus.length > 0 ? filters.skus : undefined,
        }).catch((error) => {
          console.error('❌ Error loading dashboard:', error);
          return null;
        }),
        api.getDailyStats(activeAccountId, {
          startDate,
          endDate,
          marketplaceIds: filters.marketplaceIds.length > 0 ? filters.marketplaceIds : undefined,
          skus: filters.skus.length > 0 ? filters.skus : undefined,
        }).catch((error) => {
          console.error('❌ Error loading daily stats:', error);
          return [];
        }),
        api.getInventory(activeAccountId).catch((error) => {
          console.error('❌ Error loading inventory:', error);
          return [];
        }),
        api.getProducts(activeAccountId, { startDate, endDate }).catch((error) => {
          console.error('❌ Error loading products:', error);
          return [];
        }),
        api.getCostBreakdown(activeAccountId, {
          startDate,
          endDate,
          marketplaceIds: filters.marketplaceIds.length > 0 ? filters.marketplaceIds : undefined,
          skus: filters.skus.length > 0 ? filters.skus : undefined,
        }).catch((error) => {
          console.error('❌ Error loading cost breakdown:', error);
          return null;
        }),
        api.getMarketplaceStats(activeAccountId, startDate, endDate).catch((error) => {
          console.error('❌ Error loading marketplace stats:', error);
          return [];
        }),
      ]);

      console.log('✅ All data loaded successfully');
      setDashboardData(dashboard);
      setChartData(dailyData as any[]);
      setInventoryData((inventory as any[]).slice(0, 5));
      setProductsData(products as any[]);
      setCostBreakdownData(costBreakdown);
      setMarketplaceStatsData(marketplaceStats as any[]);

      setLoading(false);
    } catch (error: any) {
      console.error('❌ Fatal error in loadData:', error);
      console.error('   Error details:', error.message, error.stack);
      alert(`❌ Errore critico nel caricamento dei dati: ${error.message || 'Errore sconosciuto'}`);
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleClientChange = (clientId: string | null) => {
    setSelectedClient(clientId);
    // Data will be reloaded automatically by useEffect
  };

  // Show loading spinner while checking authentication or loading data
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  if (!accountId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Connetti il tuo Account Amazon</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Collega il tuo account Amazon Seller per iniziare ad analizzare vendite, profitti e inventario.
          </p>

          <a
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Accedi con le tue Credenziali
          </a>

          <div className="mt-8 text-left bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">🔒 Sicurezza Garantita</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>✓ Accesso READ-ONLY ai tuoi dati</li>
              <li>✓ Nessuna modifica su Amazon</li>
              <li>✓ Puoi revocare l'accesso in qualsiasi momento</li>
            </ul>
          </div>

          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            <p>
              Hai bisogno delle credenziali SP-API?{' '}
              <a
                href="https://developer-docs.amazon.com/sp-api/docs/registering-your-application"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Guida Amazon
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                  {(currentAccount || accountId) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.192-.572.355-.95.49-2.88 1.106-5.726 1.656-8.536 1.656-4.443 0-8.59-1.156-12.44-3.468-.226-.14-.293-.3-.195-.508z" />
                      </svg>
                      <span className="text-sm font-semibold text-orange-900 dark:text-orange-300">
                        {currentAccount ? (currentAccount.name || currentAccount.sellerId) : accountId}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Panoramica completa delle tue performance Amazon
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/accounts"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Account Amazon
              </a>
              <ClientSelector
                accountId={accountId}
                selectedClient={selectedClient}
                onClientChange={handleClientChange}
              />
              <SyncButton
                accountId={accountId}
                sellingPartnerId={selectedClient}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <FiltersBar accountId={accountId} filters={filters} onChange={setFilters} />

      {/* Main Content */}
      <main className="p-6 space-y-6 relative">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Updating data...</p>
            </div>
          </div>
        )}
        {/* Profit Overview Section */}
        <ProfitOverview
          data={dashboardData}
          chartData={chartData}
          formatCurrency={formatCurrency}
        />

        {/* Metrics Overview Section */}
        <MetricsOverview
          data={dashboardData}
          formatCurrency={formatCurrency}
        />

        {/* Detailed Cost Breakdown */}
        <DetailedCostBreakdown
          data={costBreakdownData}
          formatCurrency={formatCurrency}
        />

        {/* Marketplace Comparison */}
        {marketplaceStatsData.length > 0 && (
          <MarketplaceComparison
            data={marketplaceStatsData}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Returns Analysis */}
          <ReturnsAnalysis data={dashboardData} formatCurrency={formatCurrency} />

          {/* Inventory Status */}
          <InventoryStatus data={inventoryData} />
        </div>

        {/* Top Products */}
        <TopProducts
          data={productsData}
          formatCurrency={formatCurrency}
          accountId={accountId}
          startDate={filters.dateRange.startDate}
          endDate={filters.dateRange.endDate}
        />
      </main>
    </div>
  );
}
