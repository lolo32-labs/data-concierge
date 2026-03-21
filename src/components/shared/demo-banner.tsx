import Link from 'next/link';

interface DemoBannerProps {
  storeName?: string;
  connectHref?: string;
}

export function DemoBanner({
  storeName = 'Demo Apparel Co',
  connectHref = '/',
}: DemoBannerProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-center sm:justify-between py-2 px-4 text-sm text-center sm:text-left gap-1"
      style={{
        backgroundColor: 'var(--color-warning-subtle)',
        borderBottom: '1px solid var(--color-warning)',
      }}
    >
      <span style={{ color: 'var(--text-primary)' }}>
        You&apos;re viewing <strong>{storeName}</strong> — a sample store with demo data.
      </span>
      <Link
        href={connectHref}
        className="whitespace-nowrap font-medium transition-opacity duration-100 hover:opacity-80"
        style={{ color: 'var(--brand-primary)' }}
      >
        Connect Your Real Store →
      </Link>
    </div>
  );
}
