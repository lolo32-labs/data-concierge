'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HealthScore,
  LoadingAnimation,
  ProfitSnapshot,
} from '@/components/shared';

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  healthScore: number;
  revenue: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  orders: number;
  adSpend: number;
  products: { name: string; revenue: number; cogs: number; profit: number; margin: number }[];
  channels: { name: string; revenue: number; orders: number }[];
  dateRange: { start: string | null; end: string | null };
}

interface ProductCostRow {
  name: string;
  cost: string;
  skipped: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthTitle(score: number): string {
  if (score >= 71) return 'Profit Health: Good';
  if (score >= 41) return 'Profit Health: Needs Attention';
  return 'Profit Health: Critical';
}

function healthDescription(data: DashboardData): string {
  const marginLabel =
    data.margin >= 71 ? 'Excellent' : data.margin >= 41 ? 'Healthy' : 'Thin';
  return `${marginLabel} margins overall. ${data.orders} orders generating $${data.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} in net profit.`;
}

function profitInsight(data: DashboardData): string {
  const vs = data.margin >= 45 ? 'above' : 'below';
  return `Your margin is ${data.margin.toFixed(1)}% — ${vs} the Shopify apparel industry average of 45%.`;
}

// ── Step 1: Data Sync Animation ───────────────────────────────────────────────

function StepSync({ storeName, onComplete }: { storeName: string; onComplete: () => void }) {
  return (
    <LoadingAnimation
      storeName={storeName}
      onComplete={onComplete}
    />
  );
}

// ── Step 2: Quick Cost Setup ──────────────────────────────────────────────────

interface StepCostSetupProps {
  products: { name: string; revenue: number; cogs: number; profit: number; margin: number }[];
  onContinue: () => void;
}

function StepCostSetup({ products, onContinue }: StepCostSetupProps) {
  // Use top 5 products from the real data, fall back to demo rows if none yet
  const productRows: ProductCostRow[] = (
    products.length > 0 ? products.slice(0, 5) : [
      { name: 'Classic Tee', revenue: 0, cogs: 0, profit: 0, margin: 0 },
      { name: 'Premium Hoodie', revenue: 0, cogs: 0, profit: 0, margin: 0 },
      { name: 'Jogger Pants', revenue: 0, cogs: 0, profit: 0, margin: 0 },
      { name: 'Snapback Cap', revenue: 0, cogs: 0, profit: 0, margin: 0 },
      { name: 'Canvas Tote', revenue: 0, cogs: 0, profit: 0, margin: 0 },
    ]
  ).map((p) => ({ name: p.name, cost: '', skipped: false }));

  const [rows, setRows] = useState<ProductCostRow[]>(productRows);
  const [shippingCost, setShippingCost] = useState('');

  function updateCost(index: number, value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, cost: value, skipped: false } : r))
    );
  }

  function skipRow(index: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, cost: '', skipped: true } : r))
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '40px 24px 80px',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 640, marginBottom: 40 }}>
        {/* Logo mark */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: 'var(--brand-primary)',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            ProfitSight
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 8px 0',
            letterSpacing: '-0.015em',
          }}
        >
          Help us get your profit right
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          A few quick inputs make your numbers more accurate. You can skip this and come back later.
        </p>
      </div>

      {/* Product cost rows */}
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 80px',
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--text-tertiary)',
            }}
          >
            Product
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--text-tertiary)',
            }}
          >
            Cost per unit ($)
          </span>
          <span />
        </div>

        {/* Product rows */}
        {rows.map((row, index) => (
          <div
            key={row.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 160px 80px',
              alignItems: 'center',
              padding: '12px 20px',
              borderBottom: index < rows.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: row.skipped ? 'var(--text-tertiary)' : 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {row.name}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={row.cost}
              onChange={(e) => updateCost(index, e.target.value)}
              placeholder={row.skipped ? 'estimate' : '0.00'}
              disabled={row.skipped}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                fontSize: 14,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                boxSizing: 'border-box',
                opacity: row.skipped ? 0.5 : 1,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-primary-subtle)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={() => skipRow(index)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                textAlign: 'right',
                padding: '4px 0',
                transition: 'color 0.1s',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--brand-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              Skip
            </button>
          </div>
        ))}
      </div>

      {/* Shipping cost row */}
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: '16px 20px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <label
          htmlFor="shipping-cost"
          style={{
            flex: 1,
            fontSize: 14,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            minWidth: 200,
          }}
        >
          Average shipping cost per order
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>$</span>
          <input
            id="shipping-cost"
            type="number"
            min="0"
            step="0.01"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            placeholder="0.00"
            style={{
              width: 100,
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: 14,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--brand-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-primary-subtle)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* CTAs */}
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <button
          onClick={onContinue}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-inverse)',
            backgroundColor: 'var(--brand-primary)',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--brand-primary-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
          }}
        >
          See My Profit &rarr;
        </button>

        <button
          onClick={onContinue}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            padding: 0,
            fontFamily: 'var(--font-body)',
            transition: 'color 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Skip for now — use estimates
        </button>
      </div>
    </div>
  );
}

// ── Step 3: First Snapshot ───────────────────────────────────────────────────

interface StepSnapshotProps {
  clientId: string;
  data: DashboardData;
}

function StepSnapshot({ clientId, data }: StepSnapshotProps) {
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Page container */}
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '40px 24px 80px',
        }}
      >
        {/* Logo + nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'var(--brand-primary)',
                borderRadius: 'var(--radius-md)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              ProfitSight
            </span>
          </div>
        </div>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3vw, 32px)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 6px 0',
              letterSpacing: '-0.015em',
            }}
          >
            Your Profit Snapshot
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
            Last 30 days — your store's real numbers
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
        <div style={{ marginBottom: 48 }}>
          <ProfitSnapshot
            revenue={data.revenue}
            totalCosts={data.totalCosts}
            netProfit={data.netProfit}
            margin={data.margin}
            insight={profitInsight(data)}
          />
        </div>

        {/* CTA section */}
        <div
          style={{
            borderTop: '1px solid var(--border-light)',
            paddingTop: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Ready to dig deeper?
          </p>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              margin: '0 0 20px 0',
            }}
          >
            Ask ProfitSight anything about your store — in plain English.
          </p>

          <Link
            href={`/${clientId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-inverse)',
              backgroundColor: 'var(--brand-primary)',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            Start asking questions &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // Fetch dashboard data as soon as the page mounts (in parallel with the animation)
  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/${clientId}/dashboard`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json() as Promise<DashboardData>;
      })
      .then(setDashboardData)
      .catch(() => setFetchError(true));
  }, [clientId]);

  // Step 1 → 2: animation complete
  const handleSyncComplete = useCallback(() => {
    setStep(2);
  }, []);

  // Step 2 → 3: cost setup continue
  const handleCostContinue = useCallback(() => {
    setStep(3);
  }, []);

  // ── Step 1: sync animation ──────────────────────────────────────────────────
  if (step === 1) {
    return <StepSync storeName="your store" onComplete={handleSyncComplete} />;
  }

  // ── Step 2: cost setup ──────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <StepCostSetup
        products={dashboardData?.products ?? []}
        onContinue={handleCostContinue}
      />
    );
  }

  // ── Step 3: snapshot ────────────────────────────────────────────────────────

  // Data still loading
  if (!dashboardData && !fetchError) {
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
          Loading your snapshot…
        </p>
      </div>
    );
  }

  // Error state
  if (fetchError || !dashboardData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <p style={{ color: 'var(--color-danger)', fontSize: 15 }}>
          Failed to load your dashboard. Please try again.
        </p>
        <button
          onClick={() => router.push(`/${clientId}`)}
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
          Continue to dashboard
        </button>
      </div>
    );
  }

  return <StepSnapshot clientId={clientId} data={dashboardData} />;
}
