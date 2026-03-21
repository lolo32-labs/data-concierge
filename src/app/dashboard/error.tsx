"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          {error.message || "Failed to load dashboard data. This might be a temporary issue."}
        </p>
        <button
          onClick={reset}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            background: "var(--accent-primary)",
            color: "var(--accent-primary-text)",
            fontWeight: 600,
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          Try again
        </button>
        <a
          href="/dashboard"
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            border: "1px solid var(--border-primary)",
            color: "var(--text-secondary)",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Reload page
        </a>
      </div>
    </div>
  );
}
