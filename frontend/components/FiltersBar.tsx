'use client';

import { useState, useEffect } from 'react';
import DateRangePicker, { DateRange } from './DateRangePicker';
import { api } from '@/lib/api';

export interface Filters {
  dateRange: DateRange;
  marketplaceIds: string[];
  skus: string[];
}

interface Marketplace {
  marketplaceId: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  title: string;
}

export default function FiltersBar({
  accountId,
  filters,
  onChange,
}: {
  accountId: string;
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showMarketplaceDropdown, setShowMarketplaceDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    // Only load filters data if we have a valid accountId
    if (accountId && accountId.trim() !== '') {
      loadFiltersData();
    }
  }, [accountId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowMarketplaceDropdown(false);
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadFiltersData = async () => {
    // Extra validation
    if (!accountId || accountId.trim() === '') {
      return;
    }

    try {
      const [marketplacesData, productsData] = await Promise.all([
        api.getMarketplaces(accountId),
        api.getProducts(accountId),
      ]) as [Marketplace[], Product[]];

      setMarketplaces(marketplacesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading filters data:', error);
    }
  };

  const handleDateRangeChange = (dateRange: DateRange) => {
    onChange({ ...filters, dateRange });
  };

  const toggleMarketplace = (marketplaceId: string) => {
    const newMarketplaces = filters.marketplaceIds.includes(marketplaceId)
      ? filters.marketplaceIds.filter((id) => id !== marketplaceId)
      : [...filters.marketplaceIds, marketplaceId];

    onChange({ ...filters, marketplaceIds: newMarketplaces });
  };

  const toggleProduct = (sku: string) => {
    const newSkus = filters.skus.includes(sku)
      ? filters.skus.filter((s) => s !== sku)
      : [...filters.skus, sku];

    onChange({ ...filters, skus: newSkus });
  };

  const clearAllFilters = () => {
    onChange({
      ...filters,
      marketplaceIds: [],
      skus: [],
    });
  };

  const activeFiltersCount = filters.marketplaceIds.length + filters.skus.length;

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Date Range Picker */}
            <DateRangePicker value={filters.dateRange} onChange={handleDateRangeChange} />

            <div className="h-8 w-px bg-gray-300 dark:bg-slate-600"></div>

            {/* Marketplace Filter */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => setShowMarketplaceDropdown(!showMarketplaceDropdown)}
                className="flex items-center gap-2 px-4 py-2 h-10 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Marketplaces
                  {filters.marketplaceIds.length > 0 && (
                    <span className="ml-1 text-orange-600 font-semibold">
                      ({filters.marketplaceIds.length})
                    </span>
                  )}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMarketplaceDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-y-auto z-30">
                  <div className="p-2">
                    {marketplaces.map((mp) => (
                      <label
                        key={mp.marketplaceId}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.marketplaceIds.includes(mp.marketplaceId)}
                          onChange={() => toggleMarketplace(mp.marketplaceId)}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{mp.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Filter */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => setShowProductDropdown(!showProductDropdown)}
                className="flex items-center gap-2 px-4 py-2 h-10 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Products
                  {filters.skus.length > 0 && (
                    <span className="ml-1 text-orange-600 font-semibold">
                      ({filters.skus.length})
                    </span>
                  )}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProductDropdown && (
                <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-y-auto z-30">
                  <div className="p-2">
                    {products.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.skus.includes(product.sku)}
                          onChange={() => toggleProduct(product.sku)}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {product.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{product.sku}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2 h-10 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
