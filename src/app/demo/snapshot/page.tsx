'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DemoBanner,
  HealthScore,
  InsightCard,
  LoadingAnimation,
  ProfitSnapshot,
} from '@/components/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

interface Channel {
  name: string;
  revenue: number;
  orders: number;
}

interface SnapshotData {
  healthScore: number;
  revenue: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  orders: number;
  adSpend: number;
  products: Product[];
  channels: Channel[];
  dateRange: { start: string | null; end: string | null };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function healthTitle(score: number): string {
  if (score >= 71) return 'Profit Health: Good';
  if (score >= 41) return 'Profit Health: Needs Attention';
  return 'Profit Health: Critical';
}

function healthDescription(data: SnapshotData): string {
  const marginLabel =
    data.margin >= 71 ? 'Excellent' : data.margin >= 41 ? 'Healthy' : 'Thin';
  return `${marginLabel} margins overall. ${data.orders} orders generating $${data.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} in net profit.`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DemoSnapshotPage() {
  const [animationDone, setAnimationDone] = useState(false);
  const [data, setData] = useState<SnapshotData | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // Fetch data immediately on mount (in parallel with animation)
  useEffect(() => {
    fetch('/api/demo/snapshot')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((json: SnapshotData) => setData(json))
      .catch(() => setFetchError(true));
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setAnimationDone(true);
  }, []);

  // Show loading animation until it finishes
  if (!animationDone) {
    return <LoadingAnimation storeName="Demo Apparel Co" onComplete={handleAnimationComplete} />;
  }

  // Animation done but data still loading — subtle spinner state
  if (!data && !fetchError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Loading snapshot data…
        </p>
      </div>
    );
  }

  // Error state
  if (fetchError || !data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: 'var(--color-danger)', fontSize: 15 }}>
          Failed to load snapshot. Please try again.
        </p>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const topProduct = data.products[0] ?? null;
  const bottomProduct = data.products[data.products.length - 1] ?? null;
  const topChannel = data.channels[0] ?? null;

  const adSpendPct =
    data.revenue > 0
      ? ((data.adSpend / data.revenue) * 100).toFixed(1)
      : '0.0';

  const marginVsIndustry =
    data.margin >= 45 ? 'above' : 'below';

  const profitInsight = `Your margin is ${data.margin.toFixed(1)}% — ${marginVsIndustry} the apparel industry average of 45%.`;

  const dateLabel =
    data.dateRange.start && data.dateRange.end
      ? `${formatDate(data.dateRange.start)} — ${formatDate(data.dateRange.end)}`
      : 'Last 30 days';

  // ── InsightCard descriptions ────────────────────────────────────────────────

  const marginSpreadDescription = (() => {
    if (!topProduct && !bottomProduct) return 'No product data available.';
    const parts: string[] = [];
    if (topProduct) {
      parts.push(
        `Highest margin: ${topProduct.name} (${topProduct.margin.toFixed(1)}%).`
      );
    }
    if (bottomProduct && bottomProduct.name !== topProduct?.name) {
      parts.push(`Lowest margin: ${bottomProduct.name} (${bottomProduct.margin.toFixed(1)}%).`);
    }
    return parts.join(' ');
  })();

  const adSpendDescription = `You spent $${data.adSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })} on ads this period. That's ${adSpendPct}% of revenue.`;

  const channelDescription = topChannel
    ? `Top channel: ${topChannel.name} with $${topChannel.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in revenue this period.`
    : 'No channel data available.';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Demo Banner */}
      <DemoBanner storeName="Demo Apparel Co" connectHref="/" />

      {/* Page container */}
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '40px 24px',
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3vw, 32px)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.015em',
            }}
          >
            Your Profit Snapshot
          </h1>
          <p
            style={{
              marginTop: 6,
              fontSize: 14,
              color: 'var(--text-secondary)',
            }}
          >
            {dateLabel}
          </p>
        </div>

        {/* Health Score */}
        <div style={{ marginBottom: 24 }}>
          <HealthScore
            score={data.healthScore}
            title={healthTitle(data.healthScore)}
            description={healthDescription(data)}
          />
        </div>

        {/* Profit Snapshot metrics */}
        <div style={{ marginBottom: 40 }}>
          <ProfitSnapshot
            revenue={data.revenue}
            totalCosts={data.totalCosts}
            netProfit={data.netProfit}
            margin={data.margin}
            insight={profitInsight}
          />
        </div>

        {/* Section label */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
            marginBottom: 16,
          }}
        >
          Insights
        </p>

        {/* 3 Insight Cards — responsive grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 56,
          }}
        >
          <InsightCard
            title="Margin Spread"
            description={marginSpreadDescription}
            ctaLabel="See all products"
            href="/demo/chat?q=Which+products+are+actually+making+me+money%3F"
          />
          <InsightCard
            title="Ad Spend Reality Check"
            description={adSpendDescription}
            ctaLabel="Analyze ad performance"
            href="/demo/chat?q=How+much+did+I+spend+on+ads+vs+what+they+brought+in%3F"
          />
          <InsightCard
            title="Channel Breakdown"
            description={channelDescription}
            ctaLabel="Compare all channels"
            href="/demo/chat?q=What+are+my+margins+by+sales+channel%3F"
          />
        </div>

        {/* CTA section */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 40,
            paddingTop: 40,
            borderTop: '1px solid var(--border-light)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            Ready to see your real numbers?
          </p>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              marginBottom: 28,
            }}
          >
            Connect your Shopify store and get your actual profit snapshot in 60 seconds.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Primary CTA */}
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-inverse)',
                backgroundColor: 'var(--brand-primary)',
                border: '1px solid transparent',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
              }}
            >
              Connect Your Store — Free
            </Link>

            {/* Secondary text link */}
            <Link
              href="/demo/chat"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--brand-primary)',
                textDecoration: 'none',
              }}
            >
              Or keep exploring → Ask ProfitSight a question
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
