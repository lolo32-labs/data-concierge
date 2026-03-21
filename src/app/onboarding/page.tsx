"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────────────

interface ProductVariant {
  variantId: string;
  title: string;
  sku: string | null;
  price: number;
  inventoryQuantity: number | null;
  costPerUnit: number | null;
}

interface Product {
  productId: string;
  title: string;
  variants: ProductVariant[];
}

type Step = 1 | 2 | 3;

// ── Main Component ──────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [syncStatus, setSyncStatus] = useState("syncing");
  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [profitData, setProfitData] = useState<{
    revenue: number;
    costs: number;
    profit: number;
  } | null>(null);

  // ── Step 1: Trigger sync + poll ─────────────────────────────────

  useEffect(() => {
    if (step !== 1) return;

    // Trigger sync
    fetch("/api/shopify/sync", { method: "POST" }).catch(console.error);

    // Poll for status
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/shopify/sync-status");
        const data = await res.json();
        setSyncStatus(data.syncStatus);
        setOrderCount(data.orderCount || 0);
        setProductCount(data.productCount || 0);

        if (data.syncStatus === "synced") {
          clearInterval(interval);
          // Move to step 2 after a brief pause
          setTimeout(() => setStep(2), 1000);
        } else if (data.syncStatus === "error") {
          clearInterval(interval);
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step]);

  // ── Step 2: Load products for COGS entry ────────────────────────

  useEffect(() => {
    if (step !== 2) return;

    fetch("/api/shopify/products?limit=20")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        // Pre-fill known COGS
        const initial: Record<string, string> = {};
        for (const p of data.products || []) {
          for (const v of p.variants) {
            if (v.costPerUnit != null) {
              initial[v.variantId] = v.costPerUnit.toFixed(2);
            }
          }
        }
        setCosts(initial);
      })
      .catch(console.error);
  }, [step]);

  // ── Save COGS ───────────────────────────────────────────────────

  const saveCosts = useCallback(async () => {
    setSaving(true);
    const entries = Object.entries(costs)
      .filter(([, val]) => val && parseFloat(val) >= 0)
      .map(([variantId, costPerUnit]) => ({
        variantId,
        costPerUnit: parseFloat(costPerUnit),
      }));

    try {
      await fetch("/api/shopify/cogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
    } catch (e) {
      console.error("Failed to save COGS:", e);
    }
    setSaving(false);
    setStep(3);
  }, [costs]);

  // ── Step 3: Compute profit snapshot ─────────────────────────────

  useEffect(() => {
    if (step !== 3) return;

    // Quick profit calculation from products + COGS
    let revenue = 0;
    let totalCogs = 0;
    for (const p of products) {
      for (const v of p.variants) {
        const cost = costs[v.variantId]
          ? parseFloat(costs[v.variantId])
          : 0;
        revenue += v.price * (v.inventoryQuantity || 1);
        totalCogs += cost * (v.inventoryQuantity || 1);
      }
    }
    setProfitData({
      revenue: Math.round(revenue),
      costs: Math.round(totalCogs),
      profit: Math.round(revenue - totalCogs),
    });
  }, [step, products, costs]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
      }}
    >
      {/* Stepper */}
      <div style={{ display: "flex", gap: 8, marginBottom: 48 }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 14,
              background:
                s <= step ? "var(--accent-primary)" : "var(--bg-secondary)",
              color:
                s <= step
                  ? "var(--accent-primary-text)"
                  : "var(--text-secondary)",
            }}
          >
            {s < step ? "\u2713" : s}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 640, width: "100%" }}>
        {/* ── Step 1: Sync Progress ────────────────────────────── */}
        {step === 1 && (
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Syncing your Shopify data
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: 32,
              }}
            >
              Pulling your orders and products from Shopify. This usually
              takes 1-3 minutes.
            </p>

            {/* Animated progress */}
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 8,
                padding: 32,
                marginBottom: 24,
              }}
            >
              {syncStatus === "syncing" && (
                <>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      border: "4px solid var(--border-primary)",
                      borderTopColor: "var(--accent-primary)",
                      borderRadius: "50%",
                      margin: "0 auto 16px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <p style={{ fontWeight: 600 }}>
                    {productCount > 0
                      ? `${productCount} products, ${orderCount} orders so far...`
                      : "Starting sync..."}
                  </p>
                </>
              )}
              {syncStatus === "synced" && (
                <>
                  <div
                    style={{
                      fontSize: 48,
                      marginBottom: 8,
                    }}
                  >
                    &#10003;
                  </div>
                  <p style={{ fontWeight: 600, color: "var(--semantic-success)" }}>
                    Sync complete! {productCount} products, {orderCount} orders
                  </p>
                </>
              )}
              {syncStatus === "error" && (
                <p style={{ color: "var(--semantic-error)" }}>
                  Sync failed. Please try reconnecting your store.
                </p>
              )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Step 2: COGS Entry ───────────────────────────────── */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              Enter your product costs
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: 24,
              }}
            >
              Add what each product costs you. This lets ProfitSight
              calculate your real profit. You can skip and add later.
            </p>

            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-primary)",
                    }}
                  >
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>
                      Product
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>
                      Price
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>
                      Cost
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.flatMap((p) =>
                    p.variants.map((v) => {
                      const cost = costs[v.variantId]
                        ? parseFloat(costs[v.variantId])
                        : 0;
                      const margin =
                        v.price > 0 && cost > 0
                          ? (((v.price - cost) / v.price) * 100).toFixed(1)
                          : "--";

                      return (
                        <tr
                          key={v.variantId}
                          style={{
                            borderBottom:
                              "1px solid var(--border-primary)",
                          }}
                        >
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ fontWeight: 500 }}>{p.title}</div>
                            {v.title !== "Default Title" && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {v.title}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "10px 16px",
                              textAlign: "right",
                            }}
                          >
                            ${v.price.toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "10px 16px",
                              textAlign: "right",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={costs[v.variantId] || ""}
                              onChange={(e) =>
                                setCosts((prev) => ({
                                  ...prev,
                                  [v.variantId]: e.target.value,
                                }))
                              }
                              style={{
                                width: 80,
                                padding: "6px 8px",
                                borderRadius: 4,
                                border: "1px solid var(--border-primary)",
                                background: "var(--bg-primary)",
                                color: "var(--text-primary)",
                                textAlign: "right",
                                fontSize: 14,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "10px 16px",
                              textAlign: "right",
                              color:
                                margin !== "--" && parseFloat(margin) < 0
                                  ? "var(--semantic-error)"
                                  : "var(--text-secondary)",
                            }}
                          >
                            {margin}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 24,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setStep(3)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: "1px solid var(--border-primary)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Skip for now
              </button>
              <button
                onClick={saveCosts}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--accent-primary)",
                  color: "var(--accent-primary-text)",
                  cursor: saving ? "wait" : "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Profit Reveal ────────────────────────────── */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              Your first profit snapshot
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: 32,
              }}
            >
              Here is a quick look at your numbers. Your full dashboard
              has more detail.
            </p>

            {profitData && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                  marginBottom: 32,
                }}
              >
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 8,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    Estimated Revenue
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    ${profitData.revenue.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 8,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    Total Costs
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    ${profitData.costs.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 8,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    Net Profit
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color:
                        profitData.profit >= 0
                          ? "var(--semantic-success)"
                          : "var(--semantic-error)",
                    }}
                  >
                    ${profitData.profit.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "12px 32px",
                borderRadius: 6,
                border: "none",
                background: "var(--accent-primary)",
                color: "var(--accent-primary-text)",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
