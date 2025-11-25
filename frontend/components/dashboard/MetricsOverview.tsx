
import DashboardSection from '../DashboardSection';
import StatCard from '@/components/ui/StatCard';

interface MetricsOverviewProps {
  data: any;
  formatCurrency: (value: number) => string;
}

export default function MetricsOverview({ data, formatCurrency }: MetricsOverviewProps) {
  if (!data) {
    return null;
  }

  const metrics = [
    {
      label: 'Sales',
      value: formatCurrency(data.sales || 0),
      color: 'blue' as const,
      description: 'Vendite totali',
    },
    {
      label: 'Units',
      value: (data.units || 0).toLocaleString(),
      color: 'purple' as const,
      description: 'Unità vendute',
    },
    {
      label: 'Promo',
      value: formatCurrency(data.promo || 0),
      color: 'orange' as const,
      description: 'Sconti promozionali',
    },
    {
      label: 'Advertising Cost',
      value: formatCurrency(data.advertising_cost || 0),
      color: 'orange' as const,
      description: 'Costi pubblicitari',
    },
    {
      label: 'Shipping Costs',
      value: formatCurrency(data.shipping_costs || 0),
      color: 'blue' as const,
      description: 'Costi di spedizione',
    },
    {
      label: 'Giftwrap',
      value: formatCurrency(data.giftwrap || 0),
      color: 'purple' as const,
      description: 'Costi confezione regalo',
    },
    {
      label: 'Refund Cost',
      value: formatCurrency(data.refund_cost || 0),
      color: 'red' as const,
      description: 'Costi rimborsi',
    },
    {
      label: 'Amazon Fees',
      value: formatCurrency(data.amazon_fees || 0),
      color: 'orange' as const,
      description: 'Commissioni Amazon',
    },
    {
      label: 'Cost of Goods',
      value: formatCurrency(data.cost_of_goods || 0),
      color: 'red' as const,
      description: 'Costo del venduto',
    },
    {
      label: 'VAT',
      value: formatCurrency(data.vat || 0),
      color: 'red' as const,
      description: 'IVA',
    },
    {
      label: 'Indirect Expenses',
      value: formatCurrency(data.indirect_expenses || 0),
      color: 'red' as const,
      description: 'Spese indirette',
    },
    {
      label: 'Sessions',
      value: (data.sessions || 0).toLocaleString(),
      color: 'blue' as const,
      description: 'Sessioni (N/A)',
    },
    {
      label: 'Sellable Returns',
      value: (data.sellable_returns || 0).toLocaleString(),
      color: 'green' as const,
      description: 'Resi rivendibili (N/A)',
    },
  ];

  return (
    <DashboardSection
      title="Metriche Complete"
      subtitle="Tutti i metriche per il periodo selezionato"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="h-full">
            <StatCard
              title={metric.label}
              value={metric.value}
              subtitle={metric.description}
              color={metric.color}
            />
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
