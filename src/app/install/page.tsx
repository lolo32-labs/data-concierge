"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * /install — Shopify-first entry point for new merchants.
 *
 * Two modes:
 *   1. ?shop=xxx.myshopify.com → auto-fills and auto-redirects to OAuth
 *   2. No shop param → shows a store URL input form
 *
 * No auth required — this IS the signup flow.
 * Works for both direct installs and Shopify Partner Dashboard installs.
 */
export default function InstallPage() {
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
      <InstallPageInner />
    </Suspense>
  );
}

function InstallPageInner() {
  const searchParams = useSearchParams();
  const shopParam = searchParams.get("shop");

  const [shopDomain, setShopDomain] = useState(shopParam ?? "");
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");

  // Auto-redirect if shop param is provided (e.g., from Shopify Partner Dashboard)
  useEffect(() => {
    if (shopParam && isValidDomain(shopParam)) {
      setRedirecting(true);
      window.location.href = `/api/auth/shopify/authorize?shop=${encodeURIComponent(shopParam)}`;
    }
  }, [shopParam]);

  function isValidDomain(domain: string): boolean {
    return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(domain);
  }

  function normalizeDomain(input: string): string {
    let domain = input.trim().toLowerCase();
    // Strip protocol and path
    domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    // Add .myshopify.com if missing
    if (!domain.includes(".myshopify.com")) {
      domain = domain.replace(/\.myshopify$/, "") + ".myshopify.com";
    }
    return domain;
  }

  function handleInstall() {
    setError("");
    const normalized = normalizeDomain(shopDomain);

    if (!isValidDomain(normalized)) {
      setError("Please enter a valid Shopify store URL (e.g., yourstore.myshopify.com)");
      return;
    }

    setShopDomain(normalized);
    setRedirecting(true);
    window.location.href = `/api/auth/shopify/authorize?shop=${encodeURIComponent(normalized)}`;
  }

  // Show loading state during auto-redirect
  if (shopParam && redirecting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--brand-primary)",
              marginBottom: 12,
            }}
          >
            ProfitSight
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
            Redirecting to Shopify to authorize your store...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 700,
            color: "var(--brand-primary)",
            marginBottom: 8,
          }}
        >
          ProfitSight
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 16 }}>
          Install ProfitSight on your Shopify store. No separate account needed.
        </p>

        <div
          style={{
            background: "var(--bg-secondary, #fff)",
            borderRadius: 12,
            padding: 32,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {error && (
            <div
              style={{
                background: "var(--color-danger-subtle, #fef2f2)",
                color: "var(--color-danger, #dc2626)",
                padding: "10px 14px",
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <label
            style={{
              display: "block",
              textAlign: "left",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Your Shopify store URL
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="yourstore.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInstall()}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid var(--border, #e5e5e5)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: 15,
              }}
            />
          </div>

          <button
            onClick={handleInstall}
            disabled={redirecting || !shopDomain.trim()}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--brand-primary, #00796B)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 16,
              cursor: redirecting ? "wait" : "pointer",
              opacity: redirecting || !shopDomain.trim() ? 0.6 : 1,
            }}
          >
            {redirecting ? "Redirecting to Shopify..." : "Install ProfitSight"}
          </button>

          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 12 }}>
            We only need read access to your orders and products. Your Shopify login handles everything — no separate registration.
          </p>
        </div>

        <div style={{ marginTop: 24, fontSize: 14, color: "var(--text-secondary)" }}>
          <a href="/demo/snapshot" style={{ color: "var(--brand-primary)", textDecoration: "none" }}>
            Try the demo first
          </a>
          {" "}&middot;{" "}
          <a href="/auth/login" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
