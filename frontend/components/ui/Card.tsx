
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

export default function Card({ children, className = '', title, action }: CardProps) {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-md ${className}`}>
            {(title || action) && (
                <div className="px-6 py-4 border-b border-gray-50 dark:border-slate-700 flex justify-between items-center bg-gray-50/30 dark:bg-slate-700/30">
                    {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}
