
import { useState } from 'react';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import ProfitChart from '../ProfitChart';
import SalesBreakdownChart from '../SalesBreakdownChart';
import DashboardSection from '../DashboardSection';
import { ChartBarIcon, ChartPieIcon } from '@heroicons/react/24/outline';

export default function ProfitOverview({
  data,
  chartData,
  formatCurrency,
}: {
  data: any;
  chartData: any[];
  formatCurrency: (value: number) => string;
}) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Estimate COGS & Other costs for the breakdown chart
  // Total Revenue = Profit + Fees + Ads + COGS
  // So COGS = Revenue - Profit - Fees - Ads
  const cogs = data ? Math.max(0, data.revenue - data.netProfit - data.fees - (data.ads || 0)) : 0;

  const breakdownData = {
    profit: data?.netProfit || 0,
    ads: data?.ads || 0,
    fees: data?.fees || 0,
    cogs: cogs,
  };
  return (
    <DashboardSection
      title="Profit Dashboard"
      subtitle="Overview of sales, orders, refunds and advertising costs"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Net Profit"
          value={data ? formatCurrency(data.netProfit) : '$0'}
          subtitle={data ? `${data.margin.toFixed(0)}% margin` : '0% margin'}
          color="green"
          trend={{ value: data?.margin || 0, isPositive: (data?.margin || 0) > 0 }}
        />

        <StatCard
          title="Revenue"
          value={data ? formatCurrency(data.revenue) : '$0'}
          subtitle="Last 30 days"
          color="orange"
        />

        <StatCard
          title="Total Fees"
          value={data ? formatCurrency(data.fees) : '$0'}
          subtitle="Amazon fees"
          color="red"
        />

        <StatCard
          title="VAT"
          value={data ? formatCurrency(data.vat || 0) : '$0'}
          subtitle="Estimated VAT"
          color="blue"
        />

        <StatCard
          title="Orders"
          value={data?.orderCount || 0}
          subtitle="Total orders"
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trend Chart */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/30 dark:bg-slate-700/30">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Profit Trend (Last 30 Days)</h3>
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'area'
                  ? 'bg-white dark:bg-slate-600 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                title="Area Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'bar'
                  ? 'bg-white dark:bg-slate-600 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                title="Bar Chart"
              >
                <ChartBarIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <ProfitChart data={chartData} type={chartType} />
          </div>
        </Card>

        {/* Breakdown Chart */}
        <Card title="Cost Breakdown" className="p-0">
          <div className="p-4">
            <SalesBreakdownChart data={breakdownData} formatCurrency={formatCurrency} />
          </div>
        </Card>
      </div>
    </DashboardSection>
  );
}
