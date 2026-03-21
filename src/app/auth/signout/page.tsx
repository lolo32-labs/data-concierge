"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export default function SignOutPage() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut({ callbackUrl: "/auth/login" });
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>ProfitSight</h1>
          <p style={styles.subtitle}>Are you sure you want to sign out?</p>
        </div>

        <button
          onClick={handleSignOut}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Signing out..." : "Sign Out"}
        </button>

        <p style={styles.footer}>
          <a href="/dashboard" style={styles.link}>
            Back to Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "2rem",
    boxShadow: "var(--shadow-md)",
    textAlign: "center" as const,
  },
  header: {
    marginBottom: "1.5rem",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "var(--brand-primary)",
    margin: 0,
  },
  subtitle: {
    fontFamily: "var(--font-body)",
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginTop: "0.5rem",
  },
  button: {
    fontFamily: "var(--font-body)",
    fontSize: "0.9rem",
    fontWeight: 600,
    padding: "0.7rem 2rem",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--color-danger, #dc2626)",
    color: "var(--text-inverse)",
    cursor: "pointer",
    width: "100%",
  },
  footer: {
    fontFamily: "var(--font-body)",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "1.25rem",
  },
  link: {
    color: "var(--brand-primary)",
    textDecoration: "none",
    fontWeight: 500,
  },
};
