'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import TrafficSalesChart from '@/components/analytics/TrafficSalesChart';
import ConversionFunnel from '@/components/analytics/ConversionFunnel';

// Default date range: last 90 days
const getDefaultDateRange = () => {
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  return {
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
  };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [aggregation, setAggregation] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');

  // Data states
  const [salesTrafficData, setSalesTrafficData] = useState<any[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  // Filter states
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableMarketplaces, setAvailableMarketplaces] = useState<any[]>([]);
  const [skuSearchText, setSkuSearchText] = useState<string>('');
  const [showSkuDropdown, setShowSkuDropdown] = useState<boolean>(false);

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

        // Load account info
        const accountInfo = await api.getAccount(firstAccountId);
        setCurrentAccount(accountInfo);

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
  }, [dateRange, aggregation, selectedProducts, selectedMarketplaces]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-sku-dropdown]')) {
        setShowSkuDropdown(false);
      }
    };

    if (showSkuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSkuDropdown]);

  const loadData = async (targetAccountId: string) => {
    try {
      setLoading(true);

      const [trafficData, summary, products, marketplaces] = await Promise.all([
        api.getSalesTrafficData(targetAccountId, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          aggregation,
          skus: selectedProducts.length > 0 ? selectedProducts : undefined,
          marketplaceIds: selectedMarketplaces.length > 0 ? selectedMarketplaces : undefined,
        }),
        api.getPerformanceSummary(targetAccountId, dateRange.startDate, dateRange.endDate),
        api.getAnalyticsProducts(targetAccountId),
        api.getAnalyticsMarketplaces(targetAccountId),
      ]) as [any[], any, any[], any[]];

      setSalesTrafficData(trafficData);
      setPerformanceSummary(summary);
      setAvailableProducts(products);
      setAvailableMarketplaces(marketplaces);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading analytics data:', error);
      setLoading(false);
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('it-IT').format(value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const handleSync = async () => {
    if (!accountId) return;

    try {
      setSyncing(true);
      const response = await api.triggerSync(accountId, 'analytics');

      // Wait a moment for sync to complete
      setTimeout(async () => {
        await loadData(accountId);
        setSyncing(false);
        alert('✅ Sincronizzazione completata! I dati sono stati aggiornati.');
      }, 3000);
    } catch (error: any) {
      console.error('Error syncing analytics:', error);
      alert(`❌ Errore durante la sincronizzazione: ${error.message}`);
      setSyncing(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <a href="/" className="text-orange-600 hover:text-orange-700 text-sm mb-2 block">
              ← Torna alla Dashboard
            </a>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-2">
              Marketing metrics e performance di vendita
            </p>
          </div>

          {/* Filters Row 1 */}
          <div className="flex flex-wrap items-center gap-6 mb-6">
            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${syncing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700'
                }`}
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sincronizzazione...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sincronizza
                </>
              )}
            </button>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Periodo:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Aggregation */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Aggregazione:</label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as 'DAY' | 'WEEK' | 'MONTH')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="DAY">Giornaliera</option>
                <option value="WEEK">Settimanale</option>
                <option value="MONTH">Mensile</option>
              </select>
            </div>
          </div>

          {/* Filters Row 2 - Products with Searchable Dropdown */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Prodotti (SKU):</div>

            {/* Searchable Dropdown Input */}
            <div className="relative mb-3 w-full max-w-sm" data-sku-dropdown>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cerca SKU..."
                  value={skuSearchText}
                  onChange={(e) => {
                    setSkuSearchText(e.target.value);
                    setShowSkuDropdown(true);
                  }}
                  onFocus={() => setShowSkuDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <svg
                  className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Dropdown Menu */}
              {showSkuDropdown && availableProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {availableProducts
                    .filter(
                      (product) =>
                        product.sku.toLowerCase().includes(skuSearchText.toLowerCase()) ||
                        product.asin.toLowerCase().includes(skuSearchText.toLowerCase())
                    )
                    .map((product) => {
                      const sku = product.sku;
                      const isSelected = selectedProducts.includes(sku);
                      return (
                        <label
                          key={sku}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, sku]);
                              } else {
                                setSelectedProducts(selectedProducts.filter((s) => s !== sku));
                              }
                            }}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-gray-900 font-medium">{sku}</div>
                            <div className="text-xs text-gray-500">{product.asin}</div>
                          </div>
                        </label>
                      );
                    })}
                  {availableProducts.filter(
                    (product) =>
                      product.sku.toLowerCase().includes(skuSearchText.toLowerCase()) ||
                      product.asin.toLowerCase().includes(skuSearchText.toLowerCase())
                  ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">Nessun SKU trovato</div>
                    )}
                </div>
              )}
            </div>

            {/* Selected SKUs Display */}
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedProducts.map((sku) => {
                  const product = availableProducts.find((p) => p.sku === sku);
                  return (
                    <span
                      key={sku}
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-orange-100 text-orange-800 rounded-full"
                    >
                      {sku}
                      <button
                        onClick={() => setSelectedProducts(selectedProducts.filter((s) => s !== sku))}
                        className="text-orange-600 hover:text-orange-800 font-semibold"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filters Row 3 - Marketplaces */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Mercati:</div>
            <div className="flex flex-wrap gap-3">
              {availableMarketplaces.map((marketplace) => (
                <label key={marketplace.marketplaceId} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMarketplaces.includes(marketplace.marketplaceId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMarketplaces([...selectedMarketplaces, marketplace.marketplaceId]);
                      } else {
                        setSelectedMarketplaces(selectedMarketplaces.filter(m => m !== marketplace.marketplaceId));
                      }
                    }}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">{marketplace.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* KPI Cards */}
          {performanceSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Sales */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Vendite Totali</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(performanceSummary.totalSales || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Unità vendute:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(performanceSummary.totalUnits || 0)}
                  </span>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tasso di Conversione</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatPercent(performanceSummary.conversionRate || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sessioni totali:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(performanceSummary.totalSessions || 0)}
                  </span>
                </div>
              </div>

              {/* Average Order Value */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Valore Medio Ordine</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(performanceSummary.avgOrderValue || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Ordini totali:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(performanceSummary.totalOrders || 0)}
                  </span>
                </div>
              </div>

              {/* Buy Box Percentage */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Buy Box %</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatPercent(performanceSummary.avgBuyBoxPercentage || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Visualizzazioni:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(performanceSummary.totalPageViews || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic & Sales Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Traffico & Vendite nel Tempo
              </h3>
              {salesTrafficData.length > 0 ? (
                <TrafficSalesChart data={salesTrafficData} />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">Nessun dato disponibile</p>
                </div>
              )}
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Funnel di Conversione
              </h3>
              {performanceSummary ? (
                <ConversionFunnel
                  data={{
                    pageViews: performanceSummary.totalPageViews || 0,
                    sessions: performanceSummary.totalSessions || 0,
                    orders: performanceSummary.totalOrders || 0,
                    sales: performanceSummary.totalSales || 0,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">Nessun dato disponibile</p>
                </div>
              )}
            </div>
          </div>

          {/* Data Table */}
          {salesTrafficData.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Dati Dettagliati
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visualizzazioni
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessioni
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unità Vendute
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendite
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversione %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesTrafficData.slice(0, 10).map((row: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(row.date).toLocaleDateString('it-IT')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(row.pageViews)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(row.sessions)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(row.unitsOrdered)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(row.orderedProductSales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatPercent(row.unitSessionPercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {salesTrafficData.length === 0 && !loading && (
            <div className="bg-white rounded-lg shadow p-12">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun dato disponibile</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sincronizza i dati di Sales & Traffic da Amazon per vedere le metriche.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
