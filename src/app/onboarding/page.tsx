"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

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
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "var(--bg-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
        </div>
      }
    >
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [hasStore, setHasStore] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [syncStatus, setSyncStatus] = useState("pending");
  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [autoSigningIn, setAutoSigningIn] = useState(false);
  const [profitData, setProfitData] = useState<{
    revenue: number;
    costs: number;
    profit: number;
  } | null>(null);

  // ── Auto sign-in for new OAuth installs ───────────────────────────
  // When the OAuth callback creates a new account, it sets a ps_auto_signin
  // cookie with temp credentials. We consume it here to establish the session.

  useEffect(() => {
    const isNewInstall = searchParams.get("newInstall") === "1";
    if (!isNewInstall) return;

    setAutoSigningIn(true);

    fetch("/api/auth/auto-signin", { method: "POST" })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.email && data.tempPassword) {
          await signIn("credentials", {
            email: data.email,
            password: data.tempPassword,
            redirect: false,
          });
        }
        setAutoSigningIn(false);
      })
      .catch(() => {
        setAutoSigningIn(false);
      });
  }, [searchParams]);

  // ── Step 1: Check store status, then sync if connected ──────────

  useEffect(() => {
    if (step !== 1 || autoSigningIn) return;

    // First check if user has a store connected
    fetch("/api/shopify/store-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected || (data.store && !data.needsReconnect)) {
          // Store exists — start syncing
          setHasStore(true);
          setSyncStatus("syncing");
          fetch("/api/shopify/sync", { method: "POST" }).catch(console.error);
        } else {
          // No store — show connect prompt
          setHasStore(false);
          setSyncStatus("pending");
        }
      })
      .catch(() => {
        setHasStore(false);
        setSyncStatus("pending");
      });
  }, [step, autoSigningIn]);

  // Poll for sync status only when syncing
  useEffect(() => {
    if (step !== 1 || syncStatus !== "syncing") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/shopify/sync-status");
        const data = await res.json();
        setSyncStatus(data.syncStatus);
        setOrderCount(data.orderCount || 0);
        setProductCount(data.productCount || 0);

        if (data.syncStatus === "synced") {
          clearInterval(interval);
          setTimeout(() => setStep(2), 1000);
        } else if (data.syncStatus === "error") {
          clearInterval(interval);
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, syncStatus]);

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
        {/* ── Step 1: Connect Store or Sync Progress ─────────── */}
        {step === 1 && !hasStore && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              Connect your Shopify store
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>
              Enter your Shopify store URL to get started. We will pull your
              orders and products to calculate your real profit.
            </p>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 32, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 8, maxWidth: 400, margin: "0 auto" }}>
                <input
                  type="text"
                  placeholder="yourstore.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 6,
                    border: "1px solid var(--border-primary)",
                    background: "var(--bg-primary)", color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                />
                <button
                  onClick={async () => {
                    if (!shopDomain.includes(".myshopify.com")) return;
                    // Try dev connect first (uses pre-configured token)
                    try {
                      const res = await fetch("/api/shopify/connect-dev", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ shopDomain }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setHasStore(true);
                        setSyncStatus("syncing");
                        fetch("/api/shopify/sync", { method: "POST" }).catch(console.error);
                        return;
                      }
                    } catch { /* fall through to OAuth */ }
                    // Fallback to OAuth flow
                    window.location.href = `/api/auth/shopify/authorize?shop=${encodeURIComponent(shopDomain)}`;
                  }}
                  style={{
                    padding: "12px 20px", borderRadius: 6, border: "none",
                    background: "var(--accent-primary)", color: "var(--accent-primary-text)",
                    fontWeight: 600, fontSize: 14, cursor: "pointer",
                    opacity: shopDomain.includes(".myshopify.com") ? 1 : 0.75,
                    whiteSpace: "nowrap",
                  }}
                >
                  Connect
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 12 }}>
                We only need read access to your orders and products.
              </p>
            </div>
            <a href="/demo/snapshot" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
              or try the demo first
            </a>
          </div>
        )}

        {step === 1 && hasStore && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              Syncing your Shopify data
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>
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
