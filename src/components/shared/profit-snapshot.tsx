import { MetricCard } from './metric-card';

interface ProfitSnapshotProps {
  revenue: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  insight?: string;
}

export function ProfitSnapshot({
  revenue,
  totalCosts,
  netProfit,
  margin,
  insight,
}: ProfitSnapshotProps) {
  const marginType =
    margin > 30 ? 'profit' : margin > 0 ? 'neutral' : 'loss';

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Net Profit"
          value={`$${netProfit.toLocaleString()}`}
          type="profit"
        />
        <MetricCard
          label="Revenue"
          value={`$${revenue.toLocaleString()}`}
          type="neutral"
        />
        <MetricCard
          label="Total Costs"
          value={`$${totalCosts.toLocaleString()}`}
          type="loss"
        />
        <MetricCard
          label="Margin"
          value={`${margin.toFixed(1)}%`}
          type={marginType}
        />
      </div>

      {insight && (
        <div
          className="mt-4 rounded-[var(--radius-md)] p-4 text-[13px]"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          {insight}
        </div>
      )}
    </div>
  );
}
