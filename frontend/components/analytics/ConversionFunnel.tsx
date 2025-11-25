'use client';

interface ConversionFunnelProps {
  data: {
    pageViews: number;
    sessions: number;
    orders: number;
    sales: number;
  };
}

export default function ConversionFunnel({ data }: ConversionFunnelProps) {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('it-IT').format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate conversion percentages
  const sessionRate = data.pageViews > 0 ? (data.sessions / data.pageViews) * 100 : 0;
  const orderRate = data.sessions > 0 ? (data.orders / data.sessions) * 100 : 0;
  const completionRate = data.pageViews > 0 ? (data.orders / data.pageViews) * 100 : 0;

  const stages = [
    {
      label: 'Visualizzazioni Pagina',
      value: data.pageViews,
      percentage: 100,
      color: 'bg-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      label: 'Sessioni',
      value: data.sessions,
      percentage: sessionRate,
      color: 'bg-indigo-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: 'Ordini',
      value: data.orders,
      percentage: orderRate,
      color: 'bg-green-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Completion Rate Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tasso di Completamento</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatPercent(completionRate)}
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Funnel Stages */}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative">
            {/* Stage Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`${stage.color} text-white p-3 rounded-lg`}>
                  {stage.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">{stage.label}</h4>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatNumber(stage.value)}
                      </div>
                      <div className="text-xs font-medium text-gray-500">
                        {formatPercent(stage.percentage)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow between stages */}
            {index < stages.length - 1 && (
              <div className="flex justify-center my-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Drop-off Analysis */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Analisi Drop-off</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Visualizzazioni → Sessioni:</span>
            <span className="font-semibold text-gray-900">
              -{formatPercent(100 - sessionRate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sessioni → Ordini:</span>
            <span className="font-semibold text-gray-900">
              -{formatPercent(100 - orderRate)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-300">
            <span className="text-gray-600 font-medium">Drop-off Totale:</span>
            <span className="font-bold text-gray-900">
              -{formatPercent(100 - completionRate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
