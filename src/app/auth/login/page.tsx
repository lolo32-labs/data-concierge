"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>ProfitSight</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={styles.footer}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" style={styles.link}>
            Register
          </Link>
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
  },
  header: {
    textAlign: "center" as const,
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
    marginTop: "0.25rem",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.375rem",
  },
  label: {
    fontFamily: "var(--font-body)",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  input: {
    fontFamily: "var(--font-body)",
    fontSize: "0.9rem",
    padding: "0.625rem 0.75rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-primary)",
    outline: "none",
  },
  button: {
    fontFamily: "var(--font-body)",
    fontSize: "0.9rem",
    fontWeight: 600,
    padding: "0.7rem",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--brand-primary)",
    color: "var(--text-inverse)",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  error: {
    fontFamily: "var(--font-body)",
    fontSize: "0.85rem",
    color: "var(--color-danger)",
    background: "var(--color-danger-subtle)",
    padding: "0.625rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    textAlign: "center" as const,
  },
  footer: {
    fontFamily: "var(--font-body)",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    textAlign: "center" as const,
    marginTop: "1.25rem",
  },
  link: {
    color: "var(--brand-primary)",
    textDecoration: "none",
    fontWeight: 500,
  },
};
