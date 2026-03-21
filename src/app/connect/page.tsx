"use client";

import { useState } from "react";

export default function ConnectPage() {
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");

  function handleConnect() {
    const domain = shopDomain.trim();
    if (!domain.includes(".myshopify.com")) {
      setError("Please enter a valid .myshopify.com URL.");
      return;
    }
    // Always go through Shopify OAuth — no API calls, just a redirect
    window.location.href = `/api/auth/shopify/authorize?shop=${encodeURIComponent(domain)}`;
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
          Connect your Shopify store to see your real profit in 60 seconds.
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
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
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
            onClick={handleConnect}
            disabled={!shopDomain.includes(".myshopify.com")}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--brand-primary, #00796B)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              opacity: !shopDomain.includes(".myshopify.com") ? 0.6 : 1,
            }}
          >
            Connect & Get Started
          </button>

          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 12 }}>
            We only need read access to your orders and products. No credit card required.
          </p>

          {/* Secondary path: OAuth install */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: "1px solid var(--border, #e5e5e5)",
            }}
          >
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
              Or install directly from Shopify
            </p>
            <a
              href="/install"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid var(--border, #e5e5e5)",
                background: "transparent",
                color: "var(--text-primary)",
                fontWeight: 500,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Install via Shopify
            </a>
          </div>
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
