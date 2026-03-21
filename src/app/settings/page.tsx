"use client";

import { useState, useEffect, useCallback } from "react";

interface ProductVariant {
  variantId: string;
  title: string;
  sku: string | null;
  price: number;
  costPerUnit: number | null;
  marginPct: number | null;
}

interface Product {
  productId: string;
  title: string;
  variants: ProductVariant[];
}

export default function SettingsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load products + COGS
  useEffect(() => {
    fetch("/api/shopify/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        const initial: Record<string, string> = {};
        for (const p of data.products || []) {
          for (const v of p.variants) {
            if (v.costPerUnit != null) {
              initial[v.variantId] = v.costPerUnit.toFixed(2);
            }
          }
        }
        setCosts(initial);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveCosts = useCallback(async () => {
    setSaving(true);
    setSaved(false);
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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save:", e);
    }
    setSaving(false);
  }, [costs]);

  // Count stats
  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);
  const withCogs = Object.values(costs).filter(
    (v) => v && parseFloat(v) > 0
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              Product Costs
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              {withCogs} of {totalVariants} variants have costs entered
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {saved && (
              <span style={{ color: "var(--semantic-success)", fontSize: 14 }}>
                Changes saved
              </span>
            )}
            <button
              onClick={saveCosts}
              disabled={saving}
              style={{
                padding: "10px 20px",
                borderRadius: 6,
                border: "none",
                background: "var(--accent-primary)",
                color: "var(--accent-primary-text)",
                fontWeight: 600,
                fontSize: 14,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        </div>

        {/* Missing COGS warning */}
        {totalVariants > 0 && withCogs < totalVariants && (
          <div
            style={{
              background: "var(--semantic-warning)",
              color: "#000",
              padding: "10px 16px",
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {totalVariants - withCogs} products are missing cost data. Profit
            calculations may be understated.
          </div>
        )}

        {/* Products table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 48,
              background: "var(--bg-secondary)",
              borderRadius: 8,
            }}
          >
            <p style={{ fontSize: 16, marginBottom: 8 }}>No products synced yet</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              <a href="/onboarding" style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 500 }}>Connect your Shopify store</a> to see products here.
            </p>
          </div>
        ) : (
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
                  style={{ borderBottom: "1px solid var(--border-primary)" }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    Product
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    SKU
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    Price
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    Cost
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
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
                        ? ((v.price - cost) / v.price) * 100
                        : null;

                    return (
                      <tr
                        key={v.variantId}
                        style={{
                          borderBottom: "1px solid var(--border-primary)",
                        }}
                      >
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>
                            {p.title}
                          </div>
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
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {v.sku || "--"}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            textAlign: "right",
                            fontSize: 14,
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
                            fontSize: 14,
                            fontWeight: 500,
                            color:
                              margin !== null && margin < 0
                                ? "var(--semantic-error)"
                                : margin !== null && margin > 50
                                  ? "var(--semantic-success)"
                                  : "var(--text-primary)",
                          }}
                        >
                          {margin !== null ? `${margin.toFixed(1)}%` : "--"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Back to dashboard */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <a
            href="/dashboard"
            style={{
              color: "var(--accent-primary)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
