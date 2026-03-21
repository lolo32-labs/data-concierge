"use client";

import { useState } from "react";

/**
 * Banner shown when Shopify store is disconnected (token revoked).
 * Prompts the merchant to reconnect.
 */
export default function ReconnectBanner() {
  const [shopDomain, setShopDomain] = useState("");

  return (
    <div
      style={{
        background: "var(--semantic-warning)",
        color: "#000",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <strong>Shopify disconnected.</strong> Your store data is not
        updating. Reconnect to resume syncing.
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          placeholder="yourstore.myshopify.com"
          value={shopDomain}
          onChange={(e) => setShopDomain(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid rgba(0,0,0,0.2)",
            fontSize: 14,
            width: 220,
          }}
        />
        <a
          href={
            shopDomain
              ? `/api/auth/shopify/authorize?shop=${encodeURIComponent(shopDomain)}`
              : "#"
          }
          onClick={(e) => {
            if (!shopDomain.includes(".myshopify.com")) {
              e.preventDefault();
              alert("Please enter your full Shopify domain (e.g., yourstore.myshopify.com)");
            }
          }}
          style={{
            padding: "6px 16px",
            borderRadius: 4,
            background: "#000",
            color: "#fff",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Reconnect
        </a>
      </div>
    </div>
  );
}
