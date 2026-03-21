// POST /api/billing/checkout — Create a Stripe Checkout session with 14-day trial.
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth-config";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.storeId || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
  }

  try {
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { storeId: session.user.storeId },
      },
      customer_email: session.user.email,
      success_url: `${process.env.AUTH_URL}/dashboard?billing=success`,
      cancel_url: `${process.env.AUTH_URL}/dashboard?billing=cancelled`,
      metadata: {
        userId: session.user.id,
        storeId: session.user.storeId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
