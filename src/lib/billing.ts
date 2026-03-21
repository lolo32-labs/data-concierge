// src/lib/billing.ts — Stripe billing utilities.
// Trial tracking, plan status, feature gating.
import { pool } from "./pool";

export type PlanStatus = "trial" | "active" | "past_due" | "cancelled" | "expired";

/**
 * Get the billing status for a store.
 * Used by middleware and dashboard to gate features.
 */
export async function getStoreStatus(storeId: string): Promise<{
  status: PlanStatus;
  trialDaysLeft: number | null;
}> {
  const result = await pool.query(
    "SELECT plan, trial_ends_at FROM stores WHERE id = $1",
    [storeId]
  );

  if (result.rows.length === 0) {
    return { status: "expired", trialDaysLeft: null };
  }

  const store = result.rows[0];

  if (store.plan === "active") return { status: "active", trialDaysLeft: null };
  if (store.plan === "cancelled") return { status: "cancelled", trialDaysLeft: null };
  if (store.plan === "past_due") return { status: "past_due", trialDaysLeft: null };

  // Trial logic
  if (store.trial_ends_at) {
    const trialEnd = new Date(store.trial_ends_at);
    const now = new Date();
    if (trialEnd > now) {
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { status: "trial", trialDaysLeft: daysLeft };
    }
  }

  return { status: "expired", trialDaysLeft: 0 };
}
