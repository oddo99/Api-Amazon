import DashboardSection from '../DashboardSection';

interface CostCategory {
  category: string;
  displayName: string;
  total: number;
  count: number;
  percentage: number;
  fees: Array<{
    feeType: string;
    amount: number;
    count: number;
  }>;
}

interface CostBreakdownData {
  totalFees: number;
  categories: CostCategory[];
}

const categoryColors: Record<string, string> = {
  referral: 'bg-red-500',
  fba_fulfillment: 'bg-blue-500',
  storage: 'bg-yellow-500',
  advertising: 'bg-purple-500',
  shipping: 'bg-green-500',
  removal: 'bg-orange-500',
  service: 'bg-pink-500',
  other: 'bg-gray-500',
};

export default function DetailedCostBreakdown({
  data,
  formatCurrency,
}: {
  data: CostBreakdownData | null;
  formatCurrency: (value: number) => string;
}) {
  if (!data || data.categories.length === 0) {
    return (
      <DashboardSection
        title="Cost Breakdown"
        subtitle="Detailed breakdown of all Amazon fees"
      >
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No cost data available for the selected period</p>
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Cost Breakdown"
      subtitle="Detailed breakdown of all Amazon fees"
    >
      {/* Total Fees Summary */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 p-6 rounded-lg mb-6 border border-gray-200 dark:border-slate-600">
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Fees</div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(data.totalFees)}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Across {data.categories.length} categories
        </div>
      </div>

      {/* Visual Breakdown Bar */}
      <div className="mb-6">
        <div className="flex h-8 rounded-lg overflow-hidden">
          {data.categories.map((category) => (
            <div
              key={category.category}
              className={`${categoryColors[category.category] || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-medium`}
              style={{ width: `${category.percentage}%` }}
              title={`${category.displayName}: ${category.percentage.toFixed(1)}%`}
            >
              {category.percentage > 5 && `${category.percentage.toFixed(0)}%`}
            </div>
          ))}
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {data.categories.map((category) => (
          <div key={category.category} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            {/* Category Header */}
            <div className="bg-gray-50 dark:bg-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${categoryColors[category.category] || 'bg-gray-500'}`}
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{category.displayName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{category.count} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(category.total)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {category.percentage.toFixed(1)}% of total
                </div>
              </div>
            </div>

            {/* Fee Types Breakdown */}
            {category.fees.length > 0 && (
              <div className="px-4 py-3 bg-white dark:bg-slate-900">
                <div className="space-y-2">
                  {category.fees.slice(0, 5).map((fee) => (
                    <div key={fee.feeType} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{fee.feeType}</span>
                        <span className="text-xs text-gray-400">({fee.count}x)</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(fee.amount)}
                      </span>
                    </div>
                  ))}
                  {category.fees.length > 5 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                      + {category.fees.length - 5} more fee types
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
