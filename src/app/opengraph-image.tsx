import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ProfitSight — Know your real Shopify profit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0A0E1A 0%, #1A2236 100%)",
          padding: 60,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "linear-gradient(135deg, #E8A838, #D4943A)",
            }}
          />
          <span style={{ fontSize: 48, fontWeight: 700, color: "#E8A838" }}>
            ProfitSight
          </span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#E2E8F0",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 24,
          }}
        >
          Know your real Shopify profit.
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#7A8599",
            textAlign: "center",
          }}
        >
          Not revenue. Profit. Ask in plain English. $19/mo.
        </div>
      </div>
    ),
    { ...size }
  );
}
