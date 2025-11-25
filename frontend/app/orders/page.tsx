'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import DateRangePicker, { DateRange } from '@/components/DateRangePicker';
import { formatEUR, getMarketplaceName, getMarketplaceFlag } from '@/lib/currency';
import Card from '@/components/ui/Card';

interface Order {
  id: string;
  amazonOrderId: string;
  purchaseDate: string;
  orderStatus: string;
  totalAmount: number;
  currency: string;
  numberOfItems: number;
  marketplaceId: string;
  marketplaceName?: string; // Nome del paese in italiano dal backend
  financialEventId: string | null;
  items: any[];
}

// Mapping for marketplace switching URLs
const getMarketplaceSwitchUrl = (marketplaceId: string, merchantId?: string, advertisingId?: string): string => {
  const baseUrl = 'https://sellercentral.amazon.it/home';

  // Use provided IDs or fallback to defaults (for backwards compatibility)
  const mcid = merchantId || 'amzn1.merchant.d.AB4WYP7765C7JBGEYF4B6Q4COUGA';
  const paid = advertisingId || 'amzn1.pa.d.AAD3UMUJOANH423HUEI4WOFL6NNQ';

  const commonParams = `mons_sel_dir_mcid=${mcid}&mons_sel_dir_paid=${paid}&mons_sel_dc=AAAAOtllJ5g%3D&ignore_selection_changed=true`;

  const marketplaceMap: Record<string, string> = {
    'APJ6JRA9NG5V4': 'amzn1.mp.o.APJ6JRA9NG5V4', // Italy
    'A13V1IB3VIYZZH': 'amzn1.mp.o.A13V1IB3VIYZZH', // France
    'A1PA6795UKMFR9': 'amzn1.mp.o.A1PA6795UKMFR9', // Germany
    'A1RKKUPIHCS9HS': 'amzn1.mp.o.A1RKKUPIHCS9HS', // Spain
    'A1F83G8C2ARO7P': 'amzn1.mp.o.A1F83G8C2ARO7P', // UK
    'A1805IZSGTT6HS': 'amzn1.mp.o.A1805IZSGTT6HS', // Netherlands
  };

  const mkid = marketplaceMap[marketplaceId] || marketplaceMap['APJ6JRA9NG5V4'];
  return `${baseUrl}?mons_sel_mkid=${mkid}&${commonParams}`;
};

type SortField = 'amazonOrderId' | 'purchaseDate' | 'marketplaceId' | 'orderStatus' | 'numberOfItems' | 'totalAmount';
type SortDirection = 'asc' | 'desc';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatus, setOrderStatus] = useState<string[]>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string[]>([]);
  const [availableMarketplaces, setAvailableMarketplaces] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('purchaseDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderBalances, setOrderBalances] = useState<Record<string, any>>({});
  const [loadingBalance, setLoadingBalance] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Initialize with last 30 days - use local date to avoid timezone issues
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: formatLocalDate(thirtyDaysAgo),
    endDate: formatLocalDate(today),
    preset: '30',
  });

  // Check authentication first
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, authLoading]);

  const loadData = async () => {
    try {
      // Check URL parameter for account
      const params = new URLSearchParams(window.location.search);
      const urlAccountId = params.get('account');

      const accounts = (await api.getAccounts()) as any[];
      if (accounts.length === 0) {
        setLoading(false);
        return;
      }

      // Use URL accountId if provided, otherwise use first account
      const targetAccountId = urlAccountId || accounts[0].id;
      const targetAccount = accounts.find(a => a.id === targetAccountId) || accounts[0];
      setAccountId(targetAccountId);
      setCurrentAccount(targetAccount);

      // Load orders and available marketplaces
      await Promise.all([
        loadOrders(targetAccountId, dateRange.startDate, dateRange.endDate, orderStatus, selectedMarketplace),
        loadMarketplaces(targetAccountId),
      ]);
    } catch (error) {
      console.error('Error loading orders:', error);
      setLoading(false);
    }
  };

  const loadMarketplaces = async (accId: string) => {
    try {
      const marketplaces = (await api.getMarketplaces(accId)) as any[];
      setAvailableMarketplaces(marketplaces.map((m: any) => m.marketplaceId));
    } catch (error) {
      console.error('Error loading marketplaces:', error);
    }
  };

  const loadOrders = async (accId: string, startDate?: string, endDate?: string, statuses?: string[], marketplaces?: string[]) => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (statuses && statuses.length > 0) params.status = statuses.join(',');
      if (marketplaces && marketplaces.length > 0) params.marketplaceId = marketplaces.join(',');

      const ordersData = (await api.getOrders(accId, params)) as Order[];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    if (accountId) {
      loadOrders(accountId, range.startDate, range.endDate, orderStatus, selectedMarketplace);
    }
  };

  const handleStatusChange = (status: string) => {
    const newStatuses = orderStatus.includes(status)
      ? orderStatus.filter(s => s !== status)
      : [...orderStatus, status];
    setOrderStatus(newStatuses);
    if (accountId) {
      loadOrders(accountId, dateRange.startDate, dateRange.endDate, newStatuses, selectedMarketplace);
    }
  };

  const handleMarketplaceChange = (marketplace: string) => {
    const newMarketplaces = selectedMarketplace.includes(marketplace)
      ? selectedMarketplace.filter(m => m !== marketplace)
      : [...selectedMarketplace, marketplace];
    setSelectedMarketplace(newMarketplaces);
    if (accountId) {
      loadOrders(accountId, dateRange.startDate, dateRange.endDate, orderStatus, newMarketplaces);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      Shipped: 'bg-green-100 text-green-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Canceled: 'bg-red-100 text-red-800',
      Unshipped: 'bg-blue-100 text-blue-800',
    };
    return statusColors[status] || 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default descending direction
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortOrders = (ordersToSort: Order[]) => {
    return [...ordersToSort].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle date sorting
      if (sortField === 'purchaseDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle marketplace name sorting
      if (sortField === 'marketplaceId') {
        aValue = a.marketplaceName || getMarketplaceName(aValue);
        bValue = b.marketplaceName || getMarketplaceName(bValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleRowClick = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      // Collapse if already expanded
      setExpandedOrderId(null);
      return;
    }

    // Expand and fetch balance if not already cached
    setExpandedOrderId(orderId);

    if (!orderBalances[orderId]) {
      setLoadingBalance(orderId);
      try {
        const balance = await api.getOrderBalance(accountId, orderId);
        setOrderBalances(prev => ({ ...prev, [orderId]: balance }));
      } catch (error) {
        console.error('Error loading balance:', error);
      } finally {
        setLoadingBalance(null);
      }
    }
  };

  const handleOrderLinkClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();

    // First, open the marketplace switch URL
    const switchUrl = getMarketplaceSwitchUrl(order.marketplaceId, currentAccount?.merchantId, currentAccount?.advertisingId);
    const switchWindow = window.open(switchUrl, '_blank');

    // After a short delay, open the order detail page
    setTimeout(() => {
      const orderUrl = `https://sellercentral.amazon.it/orders-v3/order/${order.amazonOrderId}`;

      if (switchWindow) {
        switchWindow.location.href = orderUrl;
      } else {
        window.open(orderUrl, '_blank');
      }
    }, 1500);
  };

  const handlePaymentLinkClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();

    // First, open the marketplace switch URL
    const switchUrl = getMarketplaceSwitchUrl(order.marketplaceId, currentAccount?.merchantId, currentAccount?.advertisingId);
    const switchWindow = window.open(switchUrl, '_blank');

    // After a short delay, open the payment view for the order
    setTimeout(() => {
      const paymentUrl = `https://sellercentral.amazon.it/payments/event/view?accountType=ALL&orderId=${order.amazonOrderId}&resultsPerPage=10&pageNumber=1`;

      if (switchWindow) {
        switchWindow.location.href = paymentUrl;
      } else {
        window.open(paymentUrl, '_blank');
      }
    }, 1500);
  };

  const handleSync = async () => {
    if (!accountId || syncing) return;

    setSyncing(true);
    setSyncProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      // Step 1: Sync orders first (0-50%)
      console.log('📦 Sincronizzazione ordini...');
      await api.triggerSync(accountId, 'orders');
      setSyncProgress(50);

      // Step 2: Sync financial reports (50-90%)
      console.log('💰 Sincronizzazione report finanziari...');
      await api.triggerSync(accountId, 'finances');
      setSyncProgress(90);

      // Step 3: Reload orders to show updated data
      console.log('🔄 Ricaricamento dati...');
      await loadOrders(accountId, dateRange.startDate, dateRange.endDate, orderStatus, selectedMarketplace);
      setSyncProgress(100);

      // Show success briefly before hiding
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress(0);
        alert('✅ Sincronizzazione completata! Ordini e report finanziari aggiornati.');
      }, 500);
    } catch (error) {
      console.error('Error syncing:', error);
      alert('❌ Errore durante la sincronizzazione. Riprova più tardi.');
      setSyncing(false);
      setSyncProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const sortedOrders = sortOrders(orders);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-400 dark:text-gray-500 ml-1">⇅</span>;
    }
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (authLoading || (loading && orders.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <a href="/" className="text-orange-600 hover:text-orange-700 text-sm mb-1 block font-medium transition-colors">
              ← Back to Dashboard
            </a>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Orders</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {loading ? 'Loading...' : `${orders.length} order${orders.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white transition-all duration-200
                ${syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 hover:shadow-md active:transform active:scale-95'}`}
            >
              {syncing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sincronizzazione...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sincronizza Ordini e Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {syncing && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                style={{ width: `${syncProgress}%` }}
              >
                {syncProgress > 10 && (
                  <span className="text-[10px] font-bold text-white drop-shadow">
                    {Math.round(syncProgress)}%
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center font-medium">
              {syncProgress < 50
                ? 'Sincronizzazione ordini da Amazon...'
                : syncProgress < 90
                  ? 'Caricamento report finanziari...'
                  : 'Ricaricamento dati...'}
            </p>
          </div>
        )}

        {/* Filters */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Date Range Picker - Full Width */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">Date Range</label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Marketplace Filter */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">Country</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableMarketplaces.map((mp) => (
                    <label
                      key={mp}
                      className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-all duration-200 ${selectedMarketplace.includes(mp)
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMarketplace.includes(mp)}
                        onChange={() => handleMarketplaceChange(mp)}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {getMarketplaceFlag(mp)} {getMarketplaceName(mp)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">Status</label>
                <div className="space-y-2">
                  {['Pending', 'Unshipped', 'Shipped', 'Canceled'].map((status) => (
                    <label
                      key={status}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={orderStatus.includes(status)}
                        onChange={() => handleStatusChange(status)}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span
                        className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}
                      >
                        {status}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Orders Table */}
        <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-black/5 p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/50">
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none transition-colors"
                    onClick={() => handleSort('amazonOrderId')}
                  >
                    Order ID <SortIcon field="amazonOrderId" />
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none transition-colors"
                    onClick={() => handleSort('purchaseDate')}
                  >
                    Date <SortIcon field="purchaseDate" />
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none transition-colors"
                    onClick={() => handleSort('marketplaceId')}
                  >
                    Country <SortIcon field="marketplaceId" />
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none transition-colors"
                    onClick={() => handleSort('orderStatus')}
                  >
                    Status <SortIcon field="orderStatus" />
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none transition-colors"
                    onClick={() => handleSort('numberOfItems')}
                  >
                    Items <SortIcon field="numberOfItems" />
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none transition-colors"
                    onClick={() => handleSort('totalAmount')}
                  >
                    Total (EUR) <SortIcon field="totalAmount" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                {/* Summary Row */}
                {orders.length > 0 && (
                  <tr className="bg-orange-50/50 dark:bg-orange-900/20 font-semibold">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white" colSpan={3}>
                      TOTALE
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {orders.length} {orders.length === 1 ? 'ordine' : 'ordini'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {orders.reduce((sum, order) => sum + order.numberOfItems, 0)} items
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatEUR(orders.reduce((sum, order) => sum + order.totalAmount, 0), 'EUR')}
                    </td>
                  </tr>
                )}
                {sortedOrders.map((order) => {
                  const balance = orderBalances[order.amazonOrderId];
                  const isExpanded = expandedOrderId === order.amazonOrderId;
                  const isLoading = loadingBalance === order.amazonOrderId;

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        onClick={() => handleRowClick(order.amazonOrderId)}
                        className={`group transition-colors cursor-pointer ${isExpanded ? 'bg-orange-50/30 dark:bg-orange-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-orange-500 dark:text-orange-400' : 'group-hover:text-gray-600 dark:group-hover:text-gray-400'}`}>
                              ▶
                            </span>
                            <a
                              href="#"
                              onClick={(e) => handleOrderLinkClick(e, order)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {order.amazonOrderId}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-300">
                            {formatDate(order.purchaseDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-300 flex items-center gap-2">
                            <span className="text-lg filter drop-shadow-sm">{getMarketplaceFlag(order.marketplaceId)}</span>
                            {order.marketplaceName || getMarketplaceName(order.marketplaceId)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              order.orderStatus
                            )}`}
                          >
                            {order.orderStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white font-medium">{order.numberOfItems}</div>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href="#"
                            onClick={(e) => handlePaymentLinkClick(e, order)}
                            className={`text-sm font-medium hover:underline cursor-pointer ${order.financialEventId
                              ? 'text-blue-600 hover:text-blue-800'
                              : 'text-red-600 hover:text-red-800'
                              }`}
                          >
                            {formatEUR(order.totalAmount, order.currency)}
                            {!order.financialEventId && (
                              <span className="ml-1 text-xs" title="Report finanziario non disponibile">⚠️</span>
                            )}
                          </a>
                        </td>
                      </tr>

                      {/* Expanded balance section */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0 border-b border-gray-100">
                            <div className="bg-gray-50/50 p-6 shadow-inner">
                              {isLoading ? (
                                <div className="text-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">Caricamento saldo...</p>
                                </div>
                              ) : !balance ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                                  Nessun evento finanziario disponibile per questo ordine
                                </div>
                              ) : !balance.hasEvents ? (
                                <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-800 p-6 shadow-sm">
                                  <div className="flex items-center justify-center mb-4">
                                    <div className="bg-blue-50 p-3 rounded-full">
                                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                  </div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white text-center mb-2">Report finanziario non ancora disponibile</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                                    Amazon rilascerà i dati dettagliati di questo ordine nei prossimi giorni.
                                    I calcoli di profitto saranno disponibili una volta che Amazon avrà processato tutti gli eventi finanziari.
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden max-w-4xl mx-auto">
                                  <div className="bg-gray-50 dark:bg-slate-700 px-6 py-3 border-b border-gray-200 dark:border-slate-600 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wide">
                                      Saldo Aggiornato Account Venditore
                                    </h3>
                                    {balance.isEstimated && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Stimato
                                      </span>
                                    )}
                                  </div>

                                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                      {/* Revenue Section */}
                                      {balance.revenue.items.length > 0 && (
                                        <div>
                                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 tracking-wider">Entrate (Lordo)</h4>
                                          <div className="space-y-2">
                                            {balance.revenue.items.map((item: any, idx: number) => (
                                              <div key={idx} className="flex justify-between text-sm group">
                                                <span className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">+ {item.description}</span>
                                                <span className="text-gray-900 dark:text-white font-medium font-mono">
                                                  {formatEUR(item.amount, order.currency)}
                                                </span>
                                              </div>
                                            ))}
                                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100 dark:border-slate-600 mt-2">
                                              <span className="text-gray-800 dark:text-gray-200">Totale Entrate</span>
                                              <span className="text-green-600 font-mono">
                                                {formatEUR(balance.revenue.total, order.currency)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-6">
                                      {/* Fees Section */}
                                      {balance.fees.byCategory.length > 0 && (
                                        <div>
                                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 tracking-wider">Commissioni e Costi</h4>
                                          <div className="space-y-4">
                                            {balance.fees.byCategory.map((category: any, idx: number) => (
                                              <div key={idx} className="bg-red-50/50 dark:bg-red-900/10 rounded-lg p-3 border border-red-100 dark:border-red-900/20">
                                                <div className="text-xs font-bold text-red-800 dark:text-red-400 uppercase mb-2">
                                                  {category.category}
                                                </div>
                                                <div className="space-y-1 ml-1">
                                                  {category.items.map((item: any, itemIdx: number) => (
                                                    <div key={itemIdx} className="flex justify-between text-sm">
                                                      <span className="text-gray-600 dark:text-gray-300 text-xs">- {item.description}</span>
                                                      <span className="text-red-600 dark:text-red-400 font-medium text-xs font-mono">
                                                        {formatEUR(item.amount, order.currency)}
                                                      </span>
                                                    </div>
                                                  ))}
                                                  <div className="flex justify-between text-sm font-medium pt-1 border-t border-red-100 dark:border-red-900/30 mt-1">
                                                    <span className="text-gray-700 dark:text-gray-300 text-xs">Subtotale</span>
                                                    <span className="text-red-700 dark:text-red-400 text-xs font-mono">
                                                      {formatEUR(category.total, order.currency)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100 dark:border-slate-600">
                                              <span className="text-gray-800 dark:text-gray-200">Totale Commissioni</span>
                                              <span className="text-red-600 dark:text-red-400 font-mono">
                                                {formatEUR(balance.fees.total, order.currency)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Refunds Section */}
                                      {balance.refunds.items.length > 0 && (
                                        <div>
                                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 tracking-wider">Rimborsi</h4>
                                          <div className="space-y-2">
                                            {balance.refunds.items.map((item: any, idx: number) => (
                                              <div key={idx} className="flex justify-between items-center py-1 hover:bg-gray-50 dark:hover:bg-slate-700">
                                                <span className="text-gray-600 dark:text-gray-300">- {item.description}</span>
                                                <span className="text-red-600 dark:text-red-400 font-medium font-mono">
                                                  {formatEUR(item.amount, order.currency)}
                                                </span>
                                              </div>
                                            ))}
                                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100 dark:border-slate-600 mt-2">
                                              <span className="text-gray-800 dark:text-gray-200">Totale Rimborsi</span>
                                              <span className="text-red-600 dark:text-red-400 font-mono">
                                                {formatEUR(balance.refunds.total, order.currency)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Net Balance Summary */}
                                  <div className="bg-orange-50 dark:bg-orange-900/20 px-6 py-4 border-t border-orange-100 dark:border-orange-900/30">
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                      <div className="text-sm text-orange-800 dark:text-orange-300">
                                        <span className="font-medium">Riepilogo:</span> Entrate - Commissioni - Rimborsi
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">Netto:</span>
                                        <span className={`text-2xl font-bold font-mono ${balance.balance.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatEUR(balance.balance.net, order.currency)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {orders.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No orders found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your date range or status filters to see more results.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
