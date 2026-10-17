import Stripe from "stripe";

let stripeClient: Stripe | undefined;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is required to process checkout.");
  }
  if (!key.startsWith("sk_test_")) {
    throw new Error("This demo only accepts Stripe test-mode secret keys.");
  }

  stripeClient ??= new Stripe(key);
  return stripeClient;
}
