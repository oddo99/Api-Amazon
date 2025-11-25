
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import { getAmazonProductUrl, getCountryFlag, COMMON_MARKETPLACES } from '@/lib/amazonUtils';
import Card from '@/components/ui/Card';

interface SkuData {
  id: string;
  sku: string;
  marketplaceId: string;
  price: number | null;
  cost: number | null;
  stock: number;
  sales30d: {
    revenue: number;
    units: number;
  };
}

interface AsinGroup {
  asin: string;
  title: string;
  imageUrl: string | null;
  skus: SkuData[];
}

export default function ProductsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [products, setProducts] = useState<AsinGroup[]>([]);
  const [expandedAsins, setExpandedAsins] = useState<Set<string>>(new Set());
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<string>('');

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

  useEffect(() => {
    if (accountId) {
      loadProducts();
    }
  }, [selectedMarketplace, accountId]);

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

      await loadProducts(targetAccountId);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setLoading(false);
    }
  };

  const loadProducts = async (accId?: string) => {
    try {
      setLoading(true);
      const id = accId || accountId;
      const productsData = (await api.getProductsByAsin(
        id,
        selectedMarketplace || undefined
      )) as AsinGroup[];
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAsin = (asin: string) => {
    const newExpanded = new Set(expandedAsins);
    if (newExpanded.has(asin)) {
      newExpanded.delete(asin);
    } else {
      newExpanded.add(asin);
    }
    setExpandedAsins(newExpanded);
  };

  const startEditCost = (skuId: string, currentCost: number | null) => {
    setEditingSku(skuId);
    setEditCost(currentCost?.toString() || '');
  };

  const saveCost = async (skuId: string) => {
    try {
      await api.updateProduct(accountId, skuId, { cost: parseFloat(editCost) });
      setEditingSku(null);
      loadProducts();
    } catch (error) {
      console.error('Error updating cost:', error);
      alert('Errore nell\'aggiornamento del costo');
    }
  };

  const cancelEdit = () => {
    setEditingSku(null);
    setEditCost('');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Caricamento prodotti...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Prodotti per ASIN</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gestisci il tuo catalogo e monitora le performance per prodotto
            </p>
          </div>

          {/* Marketplace Filter */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 pl-2">
              Marketplace:
            </label>
            <select
              value={selectedMarketplace}
              onChange={(e) => setSelectedMarketplace(e.target.value)}
              className="px-3 py-1.5 border-none bg-gray-50 dark:bg-slate-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            >
              <option value="">Tutti i marketplace</option>
              {COMMON_MARKETPLACES.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.flag} {mp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {products.length === 0 ? (
          <Card className="p-16 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Nessun prodotto trovato
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {selectedMarketplace
                ? 'Prova a selezionare un altro marketplace o rimuovi il filtro per vedere i tuoi prodotti.'
                : 'Sincronizza i dati Amazon per popolare il tuo catalogo prodotti.'}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12"></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ASIN</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prodotto</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">SKU Totali</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                  {products.map((asinGroup) => (
                    <React.Fragment key={asinGroup.asin}>
                      {/* ASIN Row */}
                      <tr
                        className={`group transition-colors cursor-pointer ${expandedAsins.has(asinGroup.asin) ? 'bg-orange-50/30 dark:bg-orange-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                        onClick={() => toggleAsin(asinGroup.asin)}
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAsin(asinGroup.asin);
                            }}
                            className={`p-1 rounded-md transition-all duration-200 ${expandedAsins.has(asinGroup.asin)
                              ? 'bg-orange-100 text-orange-600 rotate-90'
                              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-gray-300'
                              }`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={getAmazonProductUrl(
                              asinGroup.asin,
                              asinGroup.skus[0]?.marketplaceId || 'APJ6JRA9NG5V4'
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
                          >
                            {asinGroup.asin}
                            <svg className="w-3 h-3 ml-1.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {asinGroup.imageUrl ? (
                              <img
                                src={asinGroup.imageUrl}
                                alt={asinGroup.title}
                                className="w-12 h-12 object-contain rounded-lg border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-700 p-1 mr-4 shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center mr-4 text-gray-400 dark:text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            <div className="text-sm font-medium text-gray-900 dark:text-white max-w-xl truncate" title={asinGroup.title}>
                              {asinGroup.title || 'Titolo non disponibile'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {asinGroup.skus.length} SKU
                          </span>
                        </td>
                      </tr>

                      {/* Expanded SKU Rows */}
                      {expandedAsins.has(asinGroup.asin) && (
                        <tr>
                          <td colSpan={4} className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 shadow-inner">
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                              <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Paese</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">SKU</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Prezzo</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">COGS</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Stock</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Vendite 30gg</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Unità</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Azioni</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {asinGroup.skus.map((sku) => (
                                    <tr key={sku.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-colors">
                                      <td className="px-4 py-3 text-sm">
                                        <span className="text-xl filter drop-shadow-sm" title={sku.marketplaceId}>
                                          {getCountryFlag(sku.marketplaceId)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white font-mono">
                                        {sku.sku}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                                        {formatCurrency(sku.price)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-right">
                                        {editingSku === sku.id ? (
                                          <div className="flex items-center justify-end gap-2 animate-in fade-in duration-200">
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={editCost}
                                              onChange={(e) => setEditCost(e.target.value)}
                                              className="w-24 px-2 py-1 text-sm border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                              onClick={(e) => e.stopPropagation()}
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => saveCost(sku.id)}
                                              className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                                              title="Salva"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={cancelEdit}
                                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                              title="Annulla"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-gray-900 dark:text-white font-medium">
                                            {formatCurrency(sku.cost)}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-right">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sku.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                          }`}>
                                          {sku.stock}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(sku.sales30d.revenue)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                                        {sku.sales30d.units}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-right">
                                        {editingSku !== sku.id && (
                                          <button
                                            onClick={() => startEditCost(sku.id, sku.cost)}
                                            className="text-xs font-medium text-orange-600 hover:text-orange-800 hover:underline transition-colors"
                                          >
                                            Modifica Costo
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
