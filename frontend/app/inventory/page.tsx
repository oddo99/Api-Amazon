'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import Card from '@/components/ui/Card';

type SortField = 'product' | 'currentStock' | 'sales30d' | 'daysUntilOutOfStock' | 'severity';
type SortDirection = 'asc' | 'desc';

export default function InventoryPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sortField, setSortField] = useState<SortField>('daysUntilOutOfStock');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
      setAccountId(targetAccountId);

      const [inventoryData, alertsData] = await Promise.all([
        api.getInventory(targetAccountId) as Promise<any[]>,
        api.getInventoryAlerts(targetAccountId) as Promise<any[]>,
      ]);

      setInventory(inventoryData);
      setAlerts(alertsData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getSeverityValue = (severity: string) => {
    switch (severity) {
      case 'high': return 3;
      case 'medium': return 2;
      default: return 1;
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'product':
        aValue = a.product.title.toLowerCase();
        bValue = b.product.title.toLowerCase();
        break;
      case 'currentStock':
        aValue = a.currentStock;
        bValue = b.currentStock;
        break;
      case 'sales30d':
        aValue = a.sales30d || 0;
        bValue = b.sales30d || 0;
        break;
      case 'daysUntilOutOfStock':
        aValue = a.daysUntilOutOfStock;
        bValue = b.daysUntilOutOfStock;
        break;
      case 'severity':
        aValue = getSeverityValue(a.severity);
        bValue = getSeverityValue(b.severity);
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento inventario...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <a href="/" className="text-orange-600 hover:text-orange-700 text-sm mb-1 block font-medium">
                ← Torna alla Dashboard
              </a>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Inventory Management</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Monitora le scorte e gli alert di esaurimento
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 space-y-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="overflow-hidden border-l-4 border-l-orange-500">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-orange-50/50 dark:bg-orange-900/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alert Scorte Basse</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">
                {alerts.length} prodotti (ASIN) con scorte sotto la soglia - Le scorte e vendite sono aggregate per tutti gli SKU dello stesso ASIN
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th
                      onClick={() => handleSort('product')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    >
                      <div className="flex items-center">
                        Prodotto
                        <SortIcon field="product" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('currentStock')}
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    >
                      <div className="flex items-center justify-end">
                        Scorta Attuale
                        <SortIcon field="currentStock" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('sales30d')}
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    >
                      <div className="flex items-center justify-end">
                        Vendite 30gg
                        <SortIcon field="sales30d" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('daysUntilOutOfStock')}
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    >
                      <div className="flex items-center justify-end">
                        Giorni Rimanenti
                        <SortIcon field="daysUntilOutOfStock" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('severity')}
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    >
                      <div className="flex items-center justify-center">
                        Gravità
                        <SortIcon field="severity" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {sortedAlerts.map((alert, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{alert.product.title}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">ASIN: {alert.asin || alert.product.asin}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">{alert.currentStock}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{alert.sales30d || 0}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">unità</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {alert.daysUntilOutOfStock === 999 ? '∞' : alert.daysUntilOutOfStock}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">giorni</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                            alert.severity
                          )}`}
                        >
                          {alert.severity === 'high' ? 'ALTA' : alert.severity === 'medium' ? 'MEDIA' : 'BASSA'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Inventory Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventario Completo</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tutte le unità in magazzino
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Prodotto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Disponibile
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    In Arrivo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Riservato
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Non Vendibile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ultimo Agg.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.product.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{item.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.fulfillableQty}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{item.inboundQty}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{item.reservedQty}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{item.unfulfillableQty}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(item.lastUpdated).toLocaleDateString('it-IT')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {inventory.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Nessun dato inventario trovato. Sincronizza i dati Amazon per vedere l'inventario.
                </p>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div >
  );
}
