'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SalesBreakdownChartProps {
    data: {
        profit: number;
        ads: number;
        fees: number;
        cogs: number; // Cost of Goods Sold (estimated as Revenue - Profit - Ads - Fees for now, or passed directly)
    };
    formatCurrency: (value: number) => string;
}

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#a855f7'];

const CustomTooltip = ({ active, payload, formatCurrency }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 border border-gray-100 dark:border-slate-700 shadow-lg rounded-xl">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{payload[0].name}:</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(payload[0].value)}</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function SalesBreakdownChart({ data, formatCurrency }: SalesBreakdownChartProps) {
    const chartData = [
        { name: 'Net Profit', value: data.profit },
        { name: 'Ad Spend', value: data.ads },
        { name: 'Amazon Fees', value: data.fees },
        { name: 'COGS & Other', value: data.cogs },
    ].filter(item => item.value > 0);

    return (
        <div className="w-full h-[400px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                    <Legend
                        verticalAlign="bottom"
                        align="center"
                        layout="horizontal"
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value, entry: any) => (
                            <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
