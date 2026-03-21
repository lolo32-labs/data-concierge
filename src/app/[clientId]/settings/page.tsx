'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductCost {
  name: string;
  price: number;
  cost: number;
}

interface AdSpend {
  platform: string;
  emoji: string;
  amount: number;
}

// ── Fallback product data (matches client_shopify_demo schema) ────────────────

const FALLBACK_PRODUCTS: ProductCost[] = [
  { name: 'Zip-Up Jacket', price: 79.99, cost: 24 },
  { name: 'Classic Hoodie', price: 64.99, cost: 18 },
  { name: 'Oversized Crew', price: 54.99, cost: 15 },
  { name: 'Weekend Joggers', price: 49.99, cost: 14 },
  { name: 'Performance Polo', price: 44.99, cost: 12 },
  { name: 'Linen Shorts', price: 39.99, cost: 11 },
  { name: 'Slim Fit Tee', price: 34.99, cost: 8.5 },
  { name: 'Drawstring Shorts', price: 34.99, cost: 9 },
  { name: 'Canvas Tote', price: 29.99, cost: 4 },
  { name: 'Graphic Tee - Sunset', price: 29.99, cost: 7 },
  { name: 'Retro Cap', price: 24.99, cost: 5.5 },
  { name: 'Cozy Beanie', price: 19.99, cost: 3.5 },
  { name: 'Logo Socks 3-Pack', price: 14.99, cost: 2.5 },
];

const AD_PLATFORMS: AdSpend[] = [
  { platform: 'Facebook', emoji: '📘', amount: 800 },
  { platform: 'Google', emoji: '🔍', amount: 600 },
  { platform: 'Instagram', emoji: '📸', amount: 400 },
  { platform: 'TikTok', emoji: '🎵', amount: 200 },
  { platform: 'Other', emoji: '📊', amount: 100 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcMargin(price: number, cost: number): number {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

function marginColor(margin: number): string {
  if (margin >= 30) return 'var(--color-success)';
  if (margin >= 10) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 1000,
        padding: '12px 20px',
        backgroundColor: 'var(--color-success)',
        color: 'var(--text-inverse)',
        borderRadius: 'var(--radius-md)',
        fontSize: 14,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        boxShadow: 'var(--shadow-lg)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  );
}

// ── NavHeader ─────────────────────────────────────────────────────────────────

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

// ── Section: Product Costs ────────────────────────────────────────────────────

function ProductCostsSection({ onSave }: { onSave: () => void }) {
  const [products, setProducts] = useState<ProductCost[]>(FALLBACK_PRODUCTS);
  const [bulkPercent, setBulkPercent] = useState('');
  const [shippingCost, setShippingCost] = useState('4.50');

  function handleCostChange(idx: number, value: string) {
    const parsed = parseFloat(value);
    setProducts((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, cost: isNaN(parsed) ? 0 : parsed } : p
      )
    );
    onSave();
  }

  function handleBulkApply() {
    const pct = parseFloat(bulkPercent);
    if (isNaN(pct) || pct <= 0) return;
    setProducts((prev) =>
      prev.map((p) => ({ ...p, cost: parseFloat(((p.price * pct) / 100).toFixed(2)) }))
    );
    onSave();
  }

  function handleShippingChange(value: string) {
    setShippingCost(value);
    onSave();
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        marginBottom: 32,
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px 24px 16px' }}>
        <h2
          className="text-[18px] font-semibold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 4 }}
        >
          Product Costs
        </h2>
        <p
          className="text-[13px]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
        >
          Set the cost per unit for each product. This helps calculate your real profit.
        </p>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              {['Product Name', 'Retail Price', 'Cost per Unit', 'Margin Preview'].map((col) => (
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
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const margin = calcMargin(product.price, product.cost);
              return (
                <tr
                  key={product.name}
                  style={{
                    borderBottom:
                      idx < products.length - 1 ? '1px solid var(--border-light)' : 'none',
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
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {fmtCurrency(product.price)}
                  </td>
                  <td style={{ padding: '8px 24px' }}>
                    <div className="flex items-center gap-1">
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={product.cost}
                        onChange={(e) => handleCostChange(idx, e.target.value)}
                        className="tabular-nums outline-none"
                        style={{
                          width: 90,
                          backgroundColor: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '6px 10px',
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
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
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    <span
                      className="tabular-nums text-[13px] font-semibold"
                      style={{
                        color: marginColor(margin),
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk update + shipping */}
      <div
        style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Bulk Update */}
        <div>
          <p
            className="text-[12px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}
          >
            Bulk Update
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Set all costs to
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
              placeholder="e.g. 35"
              className="outline-none tabular-nums"
              style={{
                width: 72,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                fontSize: 13,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
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
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              % of retail price
            </span>
            <button
              onClick={handleBulkApply}
              style={{
                padding: '6px 16px',
                backgroundColor: 'var(--brand-primary)',
                color: 'var(--text-inverse)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--brand-primary-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Average Shipping */}
        <div className="flex items-center gap-3">
          <label
            className="text-[13px]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            Average Shipping Cost per Order:
          </label>
          <div className="flex items-center gap-1">
            <span
              style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
            >
              $
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={shippingCost}
              onChange={(e) => handleShippingChange(e.target.value)}
              className="outline-none tabular-nums"
              style={{
                width: 80,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                fontSize: 13,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
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
      </div>
    </div>
  );
}

// ── Section: Ad Spend ─────────────────────────────────────────────────────────

function AdSpendSection({ onSave }: { onSave: () => void }) {
  const [platforms, setPlatforms] = useState<AdSpend[]>(AD_PLATFORMS);

  function handleChange(idx: number, value: string) {
    const parsed = parseFloat(value);
    setPlatforms((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, amount: isNaN(parsed) ? 0 : parsed } : p
      )
    );
    onSave();
  }

  const total = platforms.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        marginBottom: 32,
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px 24px 16px' }}>
        <h2
          className="text-[18px] font-semibold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 4 }}
        >
          Ad Spend
        </h2>
        <p
          className="text-[13px]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
        >
          Enter your monthly ad spend by platform. Direct integrations coming soon.
        </p>
      </div>

      {/* Platform rows */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {platforms.map((platform, idx) => (
          <div
            key={platform.platform}
            className="flex items-center justify-between"
            style={{
              padding: '14px 24px',
              borderBottom: idx < platforms.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 20 }}>{platform.emoji}</span>
              <span
                className="text-[14px] font-medium"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
              >
                {platform.platform}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                $
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={platform.amount}
                onChange={(e) => handleChange(idx, e.target.value)}
                className="tabular-nums outline-none"
                style={{
                  width: 110,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 12px',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
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
              <span
                className="text-[13px]"
                style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', width: 24 }}
              >
                /mo
              </span>
            </div>
          </div>
        ))}

        {/* Total row */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '14px 24px',
            backgroundColor: 'var(--bg-subtle)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span
            className="text-[14px] font-semibold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
          >
            Total
          </span>
          <span
            className="tabular-nums text-[15px] font-bold"
            style={{
              color: 'var(--brand-primary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {fmtCurrency(total)}/mo
          </span>
        </div>
      </div>

      {/* Coming soon note */}
      <div
        style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--color-info-subtle)',
        }}
      >
        <p
          className="text-[12px]"
          style={{ color: 'var(--color-info)', fontFamily: 'var(--font-body)' }}
        >
          Direct ad account connections (Facebook Ads, Google Ads) coming in a future update.
        </p>
      </div>
    </div>
  );
}

// ── Client ID Validation ─────────────────────────────────────────────────────

const VALID_CLIENT_IDS = ["demo"];
function isValidClientId(id: string): boolean {
  return VALID_CLIENT_IDS.includes(id) || /^[0-9a-f-]{36}$/.test(id);
}

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();

  if (!isValidClientId(clientId)) {
    notFound();
  }

  const [storeName, setStoreName] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  // Auth check
  useEffect(() => {
    fetch(`/api/${clientId}/dashboard`)
      .then((res) => {
        if (res.status === 401) {
          router.push(`/${clientId}/login`);
        }
      })
      .catch(() => {});
  }, [clientId, router]);

  // Derive store name from clientId
  useEffect(() => {
    if (clientId) {
      const formatted = clientId
        .split('-')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setStoreName(formatted);
    }
  }, [clientId]);

  const showToast = useCallback(() => {
    setToastVisible(true);
    if (toastTimer[0]) clearTimeout(toastTimer[0]);
    const id = setTimeout(() => setToastVisible(false), 2500);
    toastTimer[0] = id;
  }, [toastTimer]);

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <NavHeader clientId={clientId} storeName={storeName} activePage="settings" />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <h1
            className="text-[24px] font-semibold"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              marginBottom: 4,
            }}
          >
            Settings
          </h1>
          <p
            className="text-[14px]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            Configure your product costs and ad spend to get accurate profit calculations.
          </p>
        </div>

        {/* Section A: Product Costs */}
        <ProductCostsSection onSave={showToast} />

        {/* Section B: Ad Spend */}
        <AdSpendSection onSave={showToast} />
      </main>

      {/* Toast notification */}
      <Toast message="Changes saved" visible={toastVisible} />
    </div>
  );
}
