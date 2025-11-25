import DashboardSection from '../DashboardSection';

export default function CostBreakdown({
  data,
  formatCurrency,
}: {
  data: any;
  formatCurrency: (value: number) => string;
}) {
  const costs = [
    {
      label: 'Amazon Fees',
      value: data?.fees || 0,
      color: 'bg-red-500',
      percentage: data ? ((data.fees / data.revenue) * 100).toFixed(1) : 0,
    },
    {
      label: 'Product Costs',
      value: data?.productCosts || 0,
      color: 'bg-orange-500',
      percentage: data ? ((data.productCosts / data.revenue) * 100).toFixed(1) : 0,
    },
    {
      label: 'Shipping',
      value: data?.shipping || 0,
      color: 'bg-yellow-500',
      percentage: data ? ((data.shipping / data.revenue) * 100).toFixed(1) : 0,
    },
    {
      label: 'Other',
      value: data?.other || 0,
      color: 'bg-gray-500',
      percentage: data ? ((data.other / data.revenue) * 100).toFixed(1) : 0,
    },
  ];

  const totalCosts = costs.reduce((sum, cost) => sum + cost.value, 0);

  return (
    <DashboardSection
      title="Cost Tracking"
      subtitle="Factor in storage fees, inbound shipment, and other costs"
    >
      <div className="space-y-4">
        {/* Total Costs */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total Costs</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(totalCosts)}
            </span>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          {costs.map((cost) => (
            <div key={cost.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-700">{cost.label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(cost.value)} ({cost.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${cost.color} h-2 rounded-full`}
                  style={{ width: `${cost.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardSection>
  );
}
