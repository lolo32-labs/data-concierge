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
      className="flex items-center justify-between py-2 px-4 text-sm"
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
        className="ml-4 whitespace-nowrap font-medium transition-opacity duration-100 hover:opacity-80"
        style={{ color: 'var(--brand-primary)' }}
      >
        Connect Your Real Store →
      </Link>
    </div>
  );
}
