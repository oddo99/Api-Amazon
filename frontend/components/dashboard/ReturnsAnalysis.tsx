import DashboardSection from '../DashboardSection';

export default function ReturnsAnalysis({
  data,
  formatCurrency,
}: {
  data: any;
  formatCurrency: (value: number) => string;
}) {
  const stats = {
    totalReturns: data?.totalReturns || 0,
    returnRate: data?.returnRate || 0,
    refundAmount: data?.refundAmount || 0,
    reimbursements: data?.reimbursements || 0,
  };

  return (
    <DashboardSection
      title="Returns & Refunds Analysis"
      subtitle="See complete breakdown of refund costs"
      action={
        <a
          href="/returns"
          className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 font-medium"
        >
          View Details →
        </a>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
          <div className="text-sm text-red-700 dark:text-red-400 mb-1">Total Returns</div>
          <div className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.totalReturns}</div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
            {stats.returnRate.toFixed(2)}% return rate
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800">
          <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">Refund Amount</div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
            {formatCurrency(stats.refundAmount)}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Last 30 days</div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
          <div className="text-sm text-green-700 dark:text-green-400 mb-1">Reimbursements</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-300">
            {formatCurrency(stats.reimbursements)}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">Recovered</div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Net Impact</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
            {formatCurrency(stats.refundAmount - stats.reimbursements)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">After reimbursements</div>
        </div>
      </div>
    </DashboardSection>
  );
}
