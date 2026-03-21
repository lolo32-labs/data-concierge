"use client";

import { useState, useEffect, useCallback } from "react";
import ReconnectBanner from "@/components/reconnect-banner";

interface ProductProfit {
  productId: string;
  title: string;
  revenue: number;
  cogs: number;
  profit: number;
  marginPct: number;
  unitsSold: number;
}

interface ChannelBreakdown {
  channel: string;
  revenue: number;
  orders: number;
  avgOrder: number;
}

interface Metrics {
  revenue: number;
  cogs: number;
  shopifyFees: number;
  adSpend: number;
  refunds: number;
  netProfit: number;
  marginPct: number;
  orderCount: number;
  avgOrderValue: number;
  productProfits: ProductProfit[];
  channelBreakdown: ChannelBreakdown[];
  missingCogsCount: number;
  period: { start: string; end: string; label: string };
  lastSyncAt: string | null;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [sortBy, setSortBy] = useState<"profit" | "revenue" | "margin">("profit");

  const loadMetrics = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?days=${days}`);
      if (res.status === 401) {
        // Check if store needs reconnect
        const statusRes = await fetch("/api/shopify/store-status");
        const status = await statusRes.json();
        setNeedsReconnect(status.needsReconnect);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error("Failed to load metrics:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMetrics(period);
  }, [period, loadMetrics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/shopify/sync", { method: "POST" });
      // Wait briefly then reload metrics
      setTimeout(() => {
        loadMetrics(period);
        setRefreshing(false);
      }, 3000);
    } catch {
      setRefreshing(false);
    }
  };

  // Sort products
  const sortedProducts = metrics?.productProfits
    ? [...metrics.productProfits].sort((a, b) => {
        if (sortBy === "revenue") return b.revenue - a.revenue;
        if (sortBy === "margin") return b.marginPct - a.marginPct;
        return b.profit - a.profit;
      })
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {needsReconnect && <ReconnectBanner />}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* Period selector */}
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                style={{
                  padding: "6px 12px", borderRadius: 4, fontSize: 13, cursor: "pointer",
                  border: "1px solid var(--border-primary)",
                  background: period === d ? "var(--accent-primary)" : "transparent",
                  color: period === d ? "var(--accent-primary-text)" : "var(--text-secondary)",
                  fontWeight: period === d ? 600 : 400,
                }}
              >
                {d}d
              </button>
            ))}
            <a href="/chat" style={{ padding: "6px 12px", borderRadius: 4, background: "var(--bg-secondary)", color: "var(--text-primary)", textDecoration: "none", fontSize: 13 }}>
              Ask a question
            </a>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80 }}>Loading metrics...</div>
        ) : !metrics ? (
          <div style={{ textAlign: "center", padding: 80, background: "var(--bg-secondary)", borderRadius: 8 }}>
            <p style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Welcome to ProfitSight</p>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              Connect your Shopify store to see your real profit. It takes about 2 minutes.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <a
                href="/onboarding"
                style={{
                  padding: "12px 24px", borderRadius: 6, background: "var(--accent-primary)",
                  color: "var(--accent-primary-text)", textDecoration: "none", fontWeight: 600, fontSize: 15,
                }}
              >
                Connect Shopify Store
              </a>
              <a
                href="/demo/snapshot"
                style={{
                  padding: "12px 24px", borderRadius: 6, border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)", textDecoration: "none", fontSize: 15,
                }}
              >
                Try Demo First
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Data freshness */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, fontSize: 13, color: "var(--text-secondary)" }}>
              <span>{metrics.period.label} ({metrics.period.start} to {metrics.period.end})</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span>Last synced: {metrics.lastSyncAt ? timeAgo(metrics.lastSyncAt) : "never"}</span>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border-primary)", background: "transparent", color: "var(--text-secondary)", cursor: refreshing ? "wait" : "pointer", fontSize: 12 }}
                >
                  {refreshing ? "Syncing..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Missing COGS warning */}
            {metrics.missingCogsCount > 0 && (
              <div style={{ background: "var(--semantic-warning)", color: "#000", padding: "10px 16px", borderRadius: 6, marginBottom: 16, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{metrics.missingCogsCount} products missing cost data. Profit may be overstated.</span>
                <a href="/settings" style={{ color: "#000", fontWeight: 600, textDecoration: "underline" }}>Add costs</a>
              </div>
            )}

            {/* Hero profit number */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 32, marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Net Profit</div>
              <div style={{ fontSize: 48, fontWeight: 700, color: metrics.netProfit >= 0 ? "var(--semantic-success)" : "var(--semantic-error)" }}>
                ${fmt(metrics.netProfit)}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                {metrics.marginPct}% margin on ${fmt(metrics.revenue)} revenue
              </div>
            </div>

            {/* Waterfall breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Revenue", value: metrics.revenue, color: "var(--text-primary)" },
                { label: "COGS", value: -metrics.cogs, color: "var(--semantic-error)" },
                { label: "Fees", value: -metrics.shopifyFees, color: "var(--semantic-error)" },
                { label: "Ad Spend", value: -metrics.adSpend, color: "var(--semantic-error)" },
                { label: "Refunds", value: -metrics.refunds, color: "var(--semantic-error)" },
              ].map((item) => (
                <div key={item.label} style={{ background: "var(--bg-secondary)", borderRadius: 6, padding: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: item.color }}>
                    {item.value < 0 ? "-" : ""}${fmt(Math.abs(item.value))}
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 6, padding: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Orders</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{metrics.orderCount}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 6, padding: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Avg Order</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>${fmt(metrics.avgOrderValue)}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 6, padding: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Ad ROAS</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {metrics.adSpend > 0 ? `${(metrics.revenue / metrics.adSpend).toFixed(1)}x` : "N/A"}
                </div>
              </div>
            </div>

            {/* Product profit table */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>Product Profitability</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["profit", "revenue", "margin"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      style={{
                        padding: "4px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer",
                        border: "1px solid var(--border-primary)",
                        background: sortBy === s ? "var(--accent-primary)" : "transparent",
                        color: sortBy === s ? "var(--accent-primary-text)" : "var(--text-secondary)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>Product</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>Revenue</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>COGS</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>Profit</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>Margin</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.map((p) => (
                      <tr key={p.productId} style={{ borderBottom: "1px solid var(--border-primary)", cursor: "pointer" }}
                        onClick={() => window.location.href = `/chat?q=${encodeURIComponent(`How is ${p.title} performing?`)}`}>
                        <td style={{ padding: "10px 16px", fontWeight: 500, fontSize: 14 }}>{p.title}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14 }}>${fmt(p.revenue)}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14 }}>${fmt(p.cogs)}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14, fontWeight: 600, color: p.profit >= 0 ? "var(--semantic-success)" : "var(--semantic-error)" }}>
                          ${fmt(p.profit)}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14, color: p.marginPct < 0 ? "var(--semantic-error)" : p.marginPct > 50 ? "var(--semantic-success)" : "var(--text-primary)" }}>
                          {p.marginPct.toFixed(1)}%
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14 }}>{p.unitsSold}</td>
                      </tr>
                    ))}
                    {sortedProducts.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>No order data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Channel breakdown */}
            {metrics.channelBreakdown.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Channels</h2>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(metrics.channelBreakdown.length, 4)}, 1fr)`, gap: 12 }}>
                  {metrics.channelBreakdown.map((ch) => (
                    <div key={ch.channel} style={{ background: "var(--bg-secondary)", borderRadius: 6, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{ch.channel}</div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>${fmt(ch.revenue)}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{ch.orders} orders, ${fmt(ch.avgOrder)} avg</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
              <a href="/chat" style={{ padding: "10px 20px", borderRadius: 6, background: "var(--accent-primary)", color: "var(--accent-primary-text)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
                Ask a Profit Question
              </a>
              <a href="/settings" style={{ padding: "10px 20px", borderRadius: 6, border: "1px solid var(--border-primary)", color: "var(--text-primary)", textDecoration: "none", fontSize: 14 }}>
                Edit Costs
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
