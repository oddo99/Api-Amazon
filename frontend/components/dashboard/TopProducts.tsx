import React, { useState } from 'react';
import DashboardSection from '../DashboardSection';
import { api } from '@/lib/api';

type SortField = 'sales' | 'units' | 'profit' | 'margin';
type SortDirection = 'asc' | 'desc';

interface Order {
  id: string;
  amazonOrderId: string;
  purchaseDate: string;
  orderStatus: string;
  totalAmount: number;
  financialEventId: string | null;
  items: Array<{
    quantity: number;
    itemPrice: number;
  }>;
}

export default function TopProducts({
  data,
  formatCurrency,
  accountId,
  startDate,
  endDate,
}: {
  data: any[];
  formatCurrency: (value: number) => string;
  accountId: string;
  startDate: string;
  endDate: string;
}) {
  const [sortField, setSortField] = useState<SortField>('units');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [productOrders, setProductOrders] = useState<Record<string, Order[]>>({});
  const [loadingOrders, setLoadingOrders] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field - default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProducts = [...(data || [])].sort((a, b) => {
    const aVal = Number(a[sortField]) || 0;
    const bVal = Number(b[sortField]) || 0;

    if (sortDirection === 'asc') {
      return aVal - bVal;
    } else {
      return bVal - aVal;
    }
  });

  const handleRowClick = async (sku: string) => {
    if (expandedSku === sku) {
      // Collapse if already expanded
      setExpandedSku(null);
      return;
    }

    // Expand and fetch orders if not already cached
    setExpandedSku(sku);

    if (!productOrders[sku]) {
      setLoadingOrders(sku);
      try {
        const orders = await api.getProductOrders(accountId, sku, {
          startDate,
          endDate,
        }) as Order[];
        setProductOrders(prev => ({ ...prev, [sku]: orders }));
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoadingOrders(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  return (
    <DashboardSection
      title="Top Selling Products"
      subtitle="Most sold products in the selected period"
      action={
        <a
          href="/products"
          className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 font-medium"
        >
          View All →
        </a>
      }
    >
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                Product
              </th>
              <th
                onClick={() => handleSort('sales')}
                className="text-right py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none"
              >
                Sales <SortIcon field="sales" />
              </th>
              <th
                onClick={() => handleSort('units')}
                className="text-right py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none"
              >
                Units <SortIcon field="units" />
              </th>
              <th
                onClick={() => handleSort('profit')}
                className="text-right py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none"
              >
                Profit <SortIcon field="profit" />
              </th>
              <th
                onClick={() => handleSort('margin')}
                className="text-right py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 select-none"
              >
                Margin <SortIcon field="margin" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {sortedProducts.map((product: any, index: number) => (
              <React.Fragment key={product.sku}>
                <tr
                  onClick={() => handleRowClick(product.sku)}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 dark:text-gray-500">
                        {expandedSku === product.sku ? '▼' : '▶'}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.asin || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(Number(product.sales) || 0)}
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-gray-900 dark:text-white">
                    {Number(product.units) || 0}
                  </td>
                  <td className="py-3 px-2 text-right text-sm font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(Number(product.profit) || 0)}
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-gray-900 dark:text-white">
                    {product.margin ? `${Number(product.margin).toFixed(1)}%` : '0%'}
                  </td>
                </tr>

                {/* Expanded orders section */}
                {expandedSku === product.sku && (
                  <tr key={`${index}-expanded`}>
                    <td colSpan={5} className="py-2 px-2 bg-gray-50 dark:bg-slate-800">
                      {loadingOrders === product.sku ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
                          <p className="mt-2 text-sm">Loading orders...</p>
                        </div>
                      ) : productOrders[product.sku]?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-slate-700">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                                  Order ID
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                                  Date
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                                  Status
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                                  Quantity
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                                  Price
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-700">
                              {productOrders[product.sku].map((order: Order) => {
                                const item = order.items[0]; // Should only have one item per SKU
                                return (
                                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                                    <td className="px-3 py-2">
                                      <a
                                        href={`https://sellercentral.amazon.it/orders-v3/order/${order.amazonOrderId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {order.amazonOrderId}
                                      </a>
                                    </td>
                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                      {formatDate(order.purchaseDate)}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-1 text-xs rounded-full ${order.orderStatus === 'Shipped' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                        order.orderStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                          order.orderStatus === 'Unshipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                        {order.orderStatus}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                                      {item.quantity}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-medium ${order.financialEventId ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
                                      }`}>
                                      {formatCurrency(item.itemPrice || 0)}
                                      {!order.financialEventId && (
                                        <span className="ml-1 text-xs" title="Report finanziario non disponibile">⚠️</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <p className="text-sm">No orders found for this product in the selected period</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {sortedProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No product data available</p>
          </div>
        )}
      </div>
    </DashboardSection>
  );
}
