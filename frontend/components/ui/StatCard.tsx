
import React from 'react';
import Card from './Card';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string;
    };
    icon?: React.ReactNode;
    color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
    loading?: boolean;
}

const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
};

export default function StatCard({
    title,
    value,
    subtitle,
    trend,
    icon,
    color = 'blue',
    loading = false
}: StatCardProps) {

    if (loading) {
        return (
            <Card className="h-full">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-full relative overflow-hidden group">
            <div className="flex justify-between items-start">
                <div className="relative z-10">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>

                    {(subtitle || trend) && (
                        <div className="mt-3 flex items-center gap-2">
                            {trend && (
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${trend.isPositive
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                        }`}
                                >
                                    {trend.isPositive ? (
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    )}
                                    {Math.round(Math.abs(trend.value))}%
                                    {trend.label && <span className="ml-1 text-gray-500 font-normal">{trend.label}</span>}
                                </span>
                            )}
                            {subtitle && !trend && (
                                <span className="text-xs text-gray-400">{subtitle}</span>
                            )}
                        </div>
                    )}
                </div>

                {icon && (
                    <div className={`p-3 rounded-xl ${colorMap[color]} bg-opacity-50 transition-transform group-hover:scale-110 duration-300`}>
                        {icon}
                    </div>
                )}
            </div>

            {/* Decorative background gradient */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 ${colorMap[color].split(' ')[0]} blur-xl`}></div>
        </Card>
    );
}
