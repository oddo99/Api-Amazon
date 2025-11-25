'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface TrafficSalesChartProps {
  data: any[];
}

export default function TrafficSalesChart({ data }: TrafficSalesChartProps) {
  // Transform data for chart
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'dd/MM'),
    sessions: item.sessions,
    pageViews: item.pageViews,
    sales: item.orderedProductSales,
    units: item.unitsOrdered,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('it-IT').format(value);
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={formatNumber}
            label={{ value: 'Traffico', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={formatCurrency}
            label={{ value: 'Vendite', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: any, name: string) => {
              if (name === 'sales') {
                return [formatCurrency(value), 'Vendite'];
              }
              if (name === 'sessions') {
                return [formatNumber(value), 'Sessioni'];
              }
              if (name === 'pageViews') {
                return [formatNumber(value), 'Visualizzazioni'];
              }
              if (name === 'units') {
                return [formatNumber(value), 'Unità'];
              }
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                sessions: 'Sessioni',
                pageViews: 'Visualizzazioni',
                sales: 'Vendite',
                units: 'Unità Vendute',
              };
              return labels[value] || value;
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sessions"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pageViews"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="sales"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="units"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
