import Link from 'next/link';

interface InsightCardProps {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export function InsightCard({ title, description, ctaLabel, href }: InsightCardProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] p-5 transition-shadow duration-150"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <p
        className="text-[15px] font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </p>
      <p
        className="mt-2 text-[13px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {description}
      </p>
      <Link
        href={href}
        className="mt-4 inline-block text-[13px] font-medium transition-opacity duration-100 hover:opacity-80"
        style={{ color: 'var(--brand-primary)' }}
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}
