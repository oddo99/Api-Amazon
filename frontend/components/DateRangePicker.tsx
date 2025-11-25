'use client';

import { useState, useEffect } from 'react';

export interface DateRange {
  startDate: string;
  endDate: string;
  preset?: string;
}

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This month', value: 'this-month' },
  { label: 'Last month', value: 'last-month' },
  { label: 'This year', value: 'this-year' },
  { label: 'Custom', value: 'custom' },
];

function getDateRangeForPreset(preset: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'this-month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: today,
      };
    case 'last-month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        startDate: lastMonth,
        endDate: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    }
    case 'this-year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: today,
      };
    default: {
      const days = parseInt(preset);
      if (!isNaN(days)) {
        return {
          startDate: new Date(today.getTime() - days * 24 * 60 * 60 * 1000),
          endDate: today,
        };
      }
      return { startDate: today, endDate: today };
    }
  }
}

export default function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  // Local state for input values
  const [localStartDate, setLocalStartDate] = useState(value.startDate);
  const [localEndDate, setLocalEndDate] = useState(value.endDate);

  // Update local state when value prop changes (from presets)
  useEffect(() => {
    setLocalStartDate(value.startDate);
    setLocalEndDate(value.endDate);
  }, [value.startDate, value.endDate]);

  const handlePresetChange = (preset: string) => {
    const range = getDateRangeForPreset(preset);

    // Format dates in local timezone to avoid UTC conversion issues
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    onChange({
      startDate: formatLocalDate(range.startDate),
      endDate: formatLocalDate(range.endDate),
      preset,
    });
  };

  const applyDateChange = () => {
    // Only apply if both dates are valid
    if (localStartDate && localEndDate) {
      onChange({
        startDate: localStartDate,
        endDate: localEndDate,
        preset: 'custom',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyDateChange();
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Custom Date Inputs - Always Visible */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 px-3 py-2">
        <input
          type="date"
          value={localStartDate}
          onChange={(e) => setLocalStartDate(e.target.value)}
          onBlur={applyDateChange}
          onKeyPress={handleKeyPress}
          className="text-sm text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0"
        />
        <span className="text-gray-400 dark:text-gray-500">→</span>
        <input
          type="date"
          value={localEndDate}
          onChange={(e) => setLocalEndDate(e.target.value)}
          onBlur={applyDateChange}
          onKeyPress={handleKeyPress}
          className="text-sm text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 p-1">
        {presets.filter(p => p.value !== 'custom').map((preset) => (
          <button
            key={preset.label}
            onClick={() =>
              handlePresetChange(preset.value?.toString() || preset.days?.toString() || '')
            }
            className={`px-3 py-1.5 text-sm rounded transition-colors ${value.preset === (preset.value || preset.days?.toString())
                ? 'bg-orange-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
