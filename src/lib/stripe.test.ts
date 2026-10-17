import { afterEach, describe, expect, it, vi } from "vitest";
import { getStripe } from "./stripe";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Stripe configuration", () => {
  it("rejects live-mode keys", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_not_for_this_demo");
    expect(() => getStripe()).toThrow("only accepts Stripe test-mode");
  });

  it("requires a secret key", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY is required");
  });
});
