'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { HealthScore, MetricCard, AlertBar } from '@/components/shared';

// ── Types ────────────────────────────────────────────────────────────────────

interface StoreMetrics {
  healthScore: number;
  revenue: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  orders: number;
  adSpend: number;
  products: ProductMetric[];
  channels: ChannelMetric[];
  dateRange: { start: string | null; end: string | null };
}

interface ProductMetric {
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

interface ChannelMetric {
  name: string;
  revenue: number;
  orders: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function healthTitle(score: number): string {
  if (score >= 71) return 'Profit Health: Good';
  if (score >= 41) return 'Profit Health: Needs Attention';
  return 'Profit Health: Critical';
}

function healthDescription(data: StoreMetrics): string {
  const label =
    data.margin >= 71 ? 'Excellent' : data.margin >= 41 ? 'Healthy' : 'Thin';
  return `${label} margins overall. ${data.orders} orders generating ${fmt(data.netProfit)} in net profit.`;
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>
      {/* Health score skeleton */}
      <div
        className="animate-pulse"
        style={{
          height: 100,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
        }}
      />
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: 100,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div
        className="animate-pulse"
        style={{
          height: 300,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
      />
    </div>
  );
}

// ── Navigation Header ────────────────────────────────────────────────────────

function NavHeader({
  clientId,
  storeName,
  activePage,
}: {
  clientId: string;
  storeName: string;
  activePage: 'dashboard' | 'chat' | 'settings';
}) {
  const navLinks = [
    { label: 'Dashboard', href: `/${clientId}`, key: 'dashboard' as const },
    { label: 'Ask ProfitSight', href: `/${clientId}/chat`, key: 'chat' as const },
    { label: 'Settings', href: `/${clientId}/settings`, key: 'settings' as const },
  ];

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 28,
            height: 28,
            backgroundColor: 'var(--brand-primary)',
            borderRadius: 'var(--radius-md)',
            flexShrink: 0,
          }}
        />
        <span
          className="font-semibold text-[15px]"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
        >
          ProfitSight
        </span>
      </div>

      {/* Center/right: Nav links */}
      <nav className="flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className="px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-100"
            style={{
              color:
                activePage === link.key
                  ? 'var(--brand-primary)'
                  : 'var(--text-secondary)',
              backgroundColor:
                activePage === link.key
                  ? 'var(--brand-primary-subtle)'
                  : 'transparent',
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Far right: Store name + avatar */}
      <div className="flex items-center gap-3">
        <span
          className="text-[13px] hidden sm:inline"
          style={{ color: 'var(--text-secondary)' }}
        >
          {storeName}
        </span>
        <div
          className="flex items-center justify-center text-[11px] font-semibold"
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--brand-primary-subtle)',
            color: 'var(--brand-primary)',
          }}
        >
          {storeName[0]?.toUpperCase() ?? '?'}
        </div>
      </div>
    </header>
  );
}

// ── Product Profit Table ─────────────────────────────────────────────────────

function ProductProfitTable({
  products,
  clientId,
}: {
  products: ProductMetric[];
  clientId: string;
}) {
  const router = useRouter();

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '20px 24px 12px' }}>
        <h2
          className="text-[18px] font-semibold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          Profit by Product
        </h2>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              {['Product', 'Revenue', 'COGS', 'Profit', 'Margin'].map((col) => (
                <th
                  key={col}
                  className="text-left"
                  style={{
                    padding: '10px 24px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => (
              <tr
                key={product.name}
                onClick={() =>
                  router.push(
                    `/${clientId}/chat?q=${encodeURIComponent(`Tell me about ${product.name} profitability`)}`
                  )
                }
                className="cursor-pointer transition-colors duration-100"
                style={{
                  borderBottom:
                    idx < products.length - 1
                      ? '1px solid var(--border-light)'
                      : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td
                  style={{
                    padding: '12px 24px',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {product.name}
                </td>
                <td
                  className="tabular-nums"
                  style={{
                    padding: '12px 24px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {fmt(product.revenue)}
                </td>
                <td
                  className="tabular-nums"
                  style={{
                    padding: '12px 24px',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {fmt(product.cogs)}
                </td>
                <td
                  className="tabular-nums"
                  style={{
                    padding: '12px 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    color:
                      product.profit >= 0
                        ? 'var(--color-success)'
                        : 'var(--color-danger)',
                  }}
                >
                  {fmt(product.profit)}
                </td>
                <td
                  className="tabular-nums"
                  style={{
                    padding: '12px 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    color:
                      product.margin >= 0
                        ? 'var(--color-success)'
                        : 'var(--color-danger)',
                  }}
                >
                  {product.margin.toFixed(1)}%
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 13,
                  }}
                >
                  No product data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Channel Breakdown ────────────────────────────────────────────────────────

function ChannelBreakdown({ channels }: { channels: ChannelMetric[] }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 24,
      }}
    >
      <h2
        className="text-[18px] font-semibold"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          marginBottom: 16,
        }}
      >
        Revenue by Channel
      </h2>

      <div className="flex flex-col gap-3">
        {channels.map((ch) => (
          <div
            key={ch.name}
            className="flex items-center justify-between py-3 px-4 rounded-md"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <p
                className="text-[14px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {ch.name}
              </p>
              <p
                className="text-[12px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {ch.orders} order{ch.orders !== 1 ? 's' : ''}
              </p>
            </div>
            <p
              className="text-[15px] font-bold tabular-nums"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {fmt(ch.revenue)}
            </p>
          </div>
        ))}
        {channels.length === 0 && (
          <p
            className="text-[13px] text-center py-4"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No channel data available yet.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [question, setQuestion] = useState('');

  const suggestedQuestions = [
    "What's my most profitable channel?",
    'Which products should I promote more?',
    "How's my ad spend performing?",
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim()) {
      router.push(`/${clientId}/chat?q=${encodeURIComponent(question.trim())}`);
    }
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 24,
      }}
    >
      <h2
        className="text-[18px] font-semibold"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          marginBottom: 16,
        }}
      >
        Quick Actions
      </h2>

      {/* Mini chat input */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask ProfitSight anything..."
          className="w-full text-[14px] outline-none"
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--brand-primary)';
            e.currentTarget.style.boxShadow =
              '0 0 0 3px var(--brand-primary-subtle)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </form>

      {/* Suggested questions */}
      <div className="flex flex-col gap-2" style={{ marginBottom: 16 }}>
        {suggestedQuestions.map((q) => (
          <button
            key={q}
            onClick={() =>
              router.push(`/${clientId}/chat?q=${encodeURIComponent(q)}`)
            }
            className="text-left text-[13px] px-3 py-2 rounded-md transition-colors duration-100 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              borderRadius: 'var(--radius-md)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--brand-primary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Update costs link */}
      <Link
        href={`/${clientId}/settings`}
        className="text-[13px] font-medium transition-opacity duration-100 hover:opacity-80"
        style={{ color: 'var(--brand-primary)' }}
      >
        Update My Costs &rarr;
      </Link>
    </div>
  );
}

// ── Dashboard Inner (uses useSearchParams for potential future use) ──────────

const VALID_CLIENT_IDS = ["demo"];
function isValidClientId(id: string): boolean {
  return VALID_CLIENT_IDS.includes(id) || /^[0-9a-f-]{36}$/.test(id);
}

function DashboardInner() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();

  if (!isValidClientId(clientId)) {
    notFound();
  }

  const [data, setData] = useState<StoreMetrics | null>(null);
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    // Fetch dashboard data
    fetch(`/api/${clientId}/dashboard`)
      .then((res) => {
        if (res.status === 401) {
          router.push(`/${clientId}/login`);
          return null;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json() as Promise<StoreMetrics>;
      })
      .then((metrics) => {
        if (metrics) setData(metrics);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [clientId, router]);

  // Fetch the store name separately — we'll just use clientId formatted nicely
  useEffect(() => {
    // Try to get client name from meta tag or config
    // Simplest approach: derive from clientId
    if (clientId) {
      const formatted = clientId
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setStoreName(formatted);
    }
  }, [clientId]);

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <NavHeader clientId={clientId} storeName={storeName || 'Loading...'} activePage="dashboard" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <NavHeader clientId={clientId} storeName={storeName} activePage="dashboard" />
        <div
          className="flex flex-col items-center justify-center gap-4"
          style={{ padding: '80px 24px' }}
        >
          <p style={{ color: 'var(--color-danger)', fontSize: 15 }}>
            Failed to load dashboard. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--brand-primary)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const showAdSpendAlert =
    data.adSpend > 0 && data.revenue > 0 && data.adSpend / data.revenue > 0.08;

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <NavHeader clientId={clientId} storeName={storeName} activePage="dashboard" />

      {/* Main content */}
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Health Score */}
        <div style={{ marginBottom: 24 }}>
          <HealthScore
            score={data.healthScore}
            title={healthTitle(data.healthScore)}
            description={healthDescription(data)}
          />
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
          <MetricCard
            label="Net Profit"
            value={fmt(data.netProfit)}
            trend="Month in progress"
            type="profit"
          />
          <MetricCard
            label="Revenue"
            value={fmt(data.revenue)}
            trend="Month in progress"
            type="neutral"
          />
          <MetricCard
            label="Ad Spend"
            value={fmt(data.adSpend)}
            trend="Month in progress"
            type="neutral"
          />
          <MetricCard
            label="Orders"
            value={data.orders.toLocaleString()}
            trend="Month in progress"
            type="neutral"
          />
        </div>

        {/* Alert Bar — conditional */}
        {showAdSpendAlert && (
          <div style={{ marginBottom: 24 }}>
            <AlertBar
              type="warning"
              message={`Your ad spend is ${((data.adSpend / data.revenue) * 100).toFixed(1)}% of revenue — above the 8% threshold. Review your campaigns for efficiency.`}
              action={{
                label: 'Analyze Ad Spend',
                href: `/${clientId}/chat?q=${encodeURIComponent("How's my ad spend performing? Am I wasting money?")}`,
              }}
            />
          </div>
        )}

        {/* Product Profit Table */}
        <div style={{ marginBottom: 48 }}>
          <ProductProfitTable products={data.products} clientId={clientId} />
        </div>

        {/* Two-column section: Channels + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ChannelBreakdown channels={data.channels} />
          </div>
          <div className="lg:col-span-2">
            <QuickActions clientId={clientId} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Page Export ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center"
          style={{
            height: '100vh',
            backgroundColor: 'var(--bg)',
            color: 'var(--text-secondary)',
            fontSize: 15,
          }}
        >
          Loading dashboard...
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
