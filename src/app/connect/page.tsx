"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function ConnectPage() {
  const [shopDomain, setShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    if (!shopDomain.includes(".myshopify.com")) return;
    setConnecting(true);
    setError("");

    try {
      // Try dev connect (auto-creates account + connects store)
      const res = await fetch("/api/shopify/connect-quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain }),
      });
      const data = await res.json();

      if (data.success) {
        // Sign in with the temp password the API created
        await signIn("credentials", {
          email: data.email,
          password: data.tempPassword,
          redirect: false,
        });
        window.location.href = "/onboarding";
        return;
      } else if (data.useOAuth) {
        // Redirect to OAuth flow for production
        window.location.href = `/api/auth/shopify/authorize?shop=${encodeURIComponent(shopDomain)}`;
      } else {
        setError(data.error || "Failed to connect. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setConnecting(false);
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
            disabled={connecting || !shopDomain.includes(".myshopify.com")}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--brand-primary, #00796B)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 16,
              cursor: connecting ? "wait" : "pointer",
              opacity: connecting || !shopDomain.includes(".myshopify.com") ? 0.6 : 1,
            }}
          >
            {connecting ? "Connecting..." : "Connect & Get Started"}
          </button>

          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 12 }}>
            We only need read access to your orders and products. No credit card required.
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
