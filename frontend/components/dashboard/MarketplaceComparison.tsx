import DashboardSection from '../DashboardSection';

interface MarketplaceStat {
  marketplaceId: string;
  revenue: number;
  fees: number;
  refunds: number;
  orderCount: number;
  netProfit: number;
  margin: number;
}

const marketplaceNames: Record<string, { name: string; flag: string }> = {
  // Official Amazon Marketplace IDs
  'ATVPDKIKX0DER': { name: 'Stati Uniti', flag: '🇺🇸' },
  'A2EUQ1WTGCTBG2': { name: 'Canada', flag: '🇨🇦' },
  'A1AM78C64UM0Y8': { name: 'Messico', flag: '🇲🇽' },
  'A2Q3Y263D00KWC': { name: 'Brasile', flag: '🇧🇷' },
  'A1F83G8C2ARO7P': { name: 'Regno Unito', flag: '🇬🇧' },
  'A1PA6795UKMFR9': { name: 'Germania', flag: '🇩🇪' },
  'A13V1IB3VIYZZH': { name: 'Francia', flag: '🇫🇷' },
  'APJ6JRA9NG5V4': { name: 'Italia', flag: '🇮🇹' },
  'A1RKKUPIHCS9HS': { name: 'Spagna', flag: '🇪🇸' },
  'A1805IZSGTT6HS': { name: 'Paesi Bassi', flag: '🇳🇱' },
  'A1C3SOZRARQ6R3': { name: 'Polonia', flag: '🇵🇱' },
  'ARBP9OOSHTCHU': { name: 'Egitto', flag: '🇪🇬' },
  'A2VIGQ35RCS4UG': { name: 'Emirati Arabi', flag: '🇦🇪' },
  'A21TJRUUN4KGV': { name: 'India', flag: '🇮🇳' },
  'A1VC38T7YXB528': { name: 'Giappone', flag: '🇯🇵' },
  'A39IBJ37TRP1C6': { name: 'Australia', flag: '🇦🇺' },
  'A19VAU5U5O7RUS': { name: 'Singapore', flag: '🇸🇬' },
  'A17E79C6D8DWNP': { name: 'Arabia Saudita', flag: '🇸🇦' },
  'A33AVAJ2PDY3EV': { name: 'Turchia', flag: '🇹🇷' },
  'AMEN7PMS3EDWL': { name: 'Turchia', flag: '🇹🇷' },
  'A2NODRKZP88ZB9': { name: 'Svezia', flag: '🇸🇪' },
  // Legacy formats (for backwards compatibility)
  'amazon.it': { name: 'Italia', flag: '🇮🇹' },
  'Amazon.it': { name: 'Italia', flag: '🇮🇹' },
  'amazon.de': { name: 'Germania', flag: '🇩🇪' },
  'Amazon.de': { name: 'Germania', flag: '🇩🇪' },
  'amazon.fr': { name: 'Francia', flag: '🇫🇷' },
  'Amazon.fr': { name: 'Francia', flag: '🇫🇷' },
  'amazon.es': { name: 'Spagna', flag: '🇪🇸' },
  'Amazon.es': { name: 'Spagna', flag: '🇪🇸' },
  'amazon.co.uk': { name: 'Regno Unito', flag: '🇬🇧' },
  'Amazon.co.uk': { name: 'Regno Unito', flag: '🇬🇧' },
  'amazon.nl': { name: 'Paesi Bassi', flag: '🇳🇱' },
  'Amazon.nl': { name: 'Paesi Bassi', flag: '🇳🇱' },
  'amazon.pl': { name: 'Polonia', flag: '🇵🇱' },
  'Amazon.pl': { name: 'Polonia', flag: '🇵🇱' },
  'amazon.com': { name: 'Stati Uniti', flag: '🇺🇸' },
  'Amazon.com': { name: 'Stati Uniti', flag: '🇺🇸' },
};

export default function MarketplaceComparison({
  data,
  formatCurrency,
}: {
  data: MarketplaceStat[] | null;
  formatCurrency: (value: number) => string;
}) {
  if (!data || data.length === 0) {
    return (
      <DashboardSection
        title="Marketplace Comparison"
        subtitle="Performance across different Amazon marketplaces"
      >
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No marketplace data available</p>
        </div>
      </DashboardSection>
    );
  }

  // Group by country name to eliminate duplicates
  const aggregatedByCountry: Record<string, MarketplaceStat & { flag: string }> = {};

  data.forEach((stat) => {
    const mpInfo = marketplaceNames[stat.marketplaceId] || {
      name: stat.marketplaceId,
      flag: '🌍',
    };
    const countryName = mpInfo.name;

    if (!aggregatedByCountry[countryName]) {
      aggregatedByCountry[countryName] = {
        marketplaceId: countryName,
        revenue: 0,
        fees: 0,
        refunds: 0,
        orderCount: 0,
        netProfit: 0,
        margin: 0,
        flag: mpInfo.flag,
      };
    }

    aggregatedByCountry[countryName].revenue += stat.revenue;
    aggregatedByCountry[countryName].fees += stat.fees;
    aggregatedByCountry[countryName].refunds += stat.refunds;
    aggregatedByCountry[countryName].orderCount += stat.orderCount;
    aggregatedByCountry[countryName].netProfit += stat.netProfit;
  });

  // Calculate margins and sort by revenue descending
  const sortedData = Object.values(aggregatedByCountry)
    .map(stat => ({
      ...stat,
      margin: stat.revenue > 0 ? (stat.netProfit / stat.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = Math.max(...sortedData.map(s => s.revenue));

  return (
    <DashboardSection
      title="Marketplace Comparison"
      subtitle="Performance across different Amazon marketplaces"
    >
      <div className="space-y-4">
        {sortedData.map((stat) => {
          const mpInfo = {
            name: stat.marketplaceId, // Already the country name
            flag: stat.flag,
          };

          return (
            <div
              key={stat.marketplaceId}
              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-orange-300 dark:hover:border-orange-600 transition-colors"
            >
              {/* Marketplace Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mpInfo.flag}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{mpInfo.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.orderCount} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(stat.netProfit)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.margin.toFixed(1)}% margin
                  </div>
                </div>
              </div>

              {/* Revenue Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Revenue</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(stat.revenue)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(stat.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
                  <div className="text-xs text-red-700 dark:text-red-400">Fees</div>
                  <div className="font-semibold text-red-900 dark:text-red-300">
                    {formatCurrency(stat.fees)}
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2">
                  <div className="text-xs text-orange-700 dark:text-orange-400">Refunds</div>
                  <div className="font-semibold text-orange-900 dark:text-orange-300">
                    {formatCurrency(stat.refunds)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardSection>
  );
}
