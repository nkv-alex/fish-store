import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getPrisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        return NextResponse.json({ error: "Checkout session has no order reference." }, { status: 400 });
      }
      try {
        await getPrisma().order.updateMany({
          where: {
            id: orderId,
            stripeCheckoutSessionId: session.id,
            status: "PENDING",
          },
          data: { status: "PAID" },
        });
      } catch (error) {
        console.error("Unable to mark order as paid:", error);
        return NextResponse.json({ error: "Unable to update order." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
