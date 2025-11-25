'use client';

import { useState, useEffect } from 'react';

interface BuyBoxProduct {
  asin: string;
  title: string;
  marketplaceId: string;
  currentBuyBox: number;
  averageBuyBox: number;
  trend: 'up' | 'down' | 'stable';
  lastChecked: Date;
  sales: number;
  units: number;
  pageViews: number;
  sessions: number;
}

interface BuyBoxMonitorProps {
  data: BuyBoxProduct[];
  loading?: boolean;
  onSort?: (sortBy: string) => void;
}

export default function BuyBoxMonitor({ data, loading, onSort }: BuyBoxMonitorProps) {
  const [sortBy, setSortBy] = useState<string>('buybox-asc');

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
    return `${value.toFixed(1)}%`;
  };

  const getBuyBoxColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600 bg-green-50';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (trend === 'down') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  const handleSort = (newSortBy: string) => {
    setSortBy(newSortBy);
    if (onSort) {
      onSort(newSortBy);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun dato disponibile</h3>
        <p className="mt-1 text-sm text-gray-500">
          Sincronizza i dati di Sales & Traffic per vedere le informazioni sulla Buy Box.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Ordina per:</label>
        <select
          value={sortBy}
          onChange={(e) => handleSort(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="buybox-asc">Buy Box % (Crescente)</option>
          <option value="buybox-desc">Buy Box % (Decrescente)</option>
          <option value="sales">Vendite</option>
          <option value="product">Prodotto (A-Z)</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prodotto
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Buy Box %
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Media 30gg
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trend
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendite
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unità
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visualizzazioni
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessioni
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ultimo Check
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((product) => (
              <tr key={product.asin} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {product.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {product.asin}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getBuyBoxColor(product.currentBuyBox)}`}>
                    {formatPercent(product.currentBuyBox)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm text-gray-900">
                    {formatPercent(product.averageBuyBox)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    {getTrendIcon(product.trend)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {formatCurrency(product.sales)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {formatNumber(product.units)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {formatNumber(product.pageViews)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {formatNumber(product.sessions)}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-500">
                  {new Date(product.lastChecked).toLocaleDateString('it-IT')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-green-50 border-2 border-green-600"></span>
          <span className="text-gray-600">95-100% (Eccellente)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-yellow-50 border-2 border-yellow-600"></span>
          <span className="text-gray-600">80-94% (Buono)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-orange-50 border-2 border-orange-600"></span>
          <span className="text-gray-600">50-79% (Medio)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-red-50 border-2 border-red-600"></span>
          <span className="text-gray-600">0-49% (Basso)</span>
        </div>
      </div>
    </div>
  );
}
