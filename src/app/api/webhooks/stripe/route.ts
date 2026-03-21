// POST /api/webhooks/stripe — Stripe webhook handler.
// Handles subscription lifecycle: created, updated, deleted, payment events.
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "@/lib/pool";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const storeId = session.metadata?.storeId;
        if (storeId) {
          await pool.query(
            `UPDATE stores SET
               plan = 'active',
               trial_ends_at = NOW() + INTERVAL '14 days',
               stripe_customer_id = $2,
               stripe_subscription_id = $3,
               updated_at = now()
             WHERE id = $1`,
            [storeId, session.customer, session.subscription]
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const storeId = sub.metadata?.storeId;
        if (storeId) {
          const status = sub.status === "active" ? "active"
            : sub.status === "past_due" ? "past_due"
            : sub.status === "canceled" ? "cancelled"
            : "active";
          await pool.query(
            "UPDATE stores SET plan = $2, updated_at = now() WHERE id = $1",
            [storeId, status]
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const storeId = sub.metadata?.storeId;
        if (storeId) {
          await pool.query(
            "UPDATE stores SET plan = 'cancelled', updated_at = now() WHERE id = $1",
            [storeId]
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await pool.query(
            "UPDATE stores SET plan = 'past_due', updated_at = now() WHERE stripe_customer_id = $1",
            [customerId]
          );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await pool.query(
            "UPDATE stores SET plan = 'active', updated_at = now() WHERE stripe_customer_id = $1",
            [customerId]
          );
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Stripe webhook handler error [${event.type}]:`, error);
  }

  return NextResponse.json({ received: true });
}
