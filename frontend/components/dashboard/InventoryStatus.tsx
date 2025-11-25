import DashboardSection from '../DashboardSection';

export default function InventoryStatus({
  data,
}: {
  data: any;
}) {
  const inventoryItems = data || [
    { sku: 'Loading...', name: 'Loading...', quantity: 0, status: 'ok' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'text-yellow-600 bg-yellow-100';
      case 'out':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-green-600 bg-green-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'low':
        return 'Low Stock';
      case 'out':
        return 'Out of Stock';
      default:
        return 'In Stock';
    }
  };

  return (
    <DashboardSection
      title="Inventory Management"
      subtitle="Get notified about stock shortage estimates"
      action={
        <a
          href="/inventory"
          className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 font-medium"
        >
          View All →
        </a>
      }
    >
      <div className="space-y-3">
        {inventoryItems.slice(0, 5).map((item: any, index: number) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name || item.sku}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">SKU: {item.sku}</div>
            </div>
            <div className="text-right mr-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.quantity} units
              </div>
            </div>
            <div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                  item.status
                )}`}
              >
                {getStatusText(item.status)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {inventoryItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No inventory data available</p>
        </div>
      )}
    </DashboardSection>
  );
}
