interface MetricCardProps {
  label: string;
  value: string;
  trend?: string;
  type?: 'profit' | 'loss' | 'neutral';
}

export function MetricCard({ label, value, trend, type = 'neutral' }: MetricCardProps) {
  const valueColor =
    type === 'profit'
      ? 'var(--brand-primary)'
      : type === 'loss'
      ? 'var(--color-danger)'
      : 'var(--text-primary)';

  return (
    <div
      className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)]"
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[28px] font-bold tabular-nums"
        style={{ color: valueColor, fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
      {trend !== undefined && (
        <p
          className="mt-1 text-[11px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {trend}
        </p>
      )}
    </div>
  );
}
