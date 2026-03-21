import Link from "next/link";

export default function NotFound() {
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
        <h1 style={{ fontSize: 64, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>
          404
        </h1>
        <p style={{ fontSize: 18, marginBottom: 24 }}>Page not found</p>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 14 }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            href="/"
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              background: "var(--accent-primary)",
              color: "var(--accent-primary-text)",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Go Home
          </Link>
          <Link
            href="/demo/snapshot"
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: "1px solid var(--border-primary)",
              color: "var(--text-primary)",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Try Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
