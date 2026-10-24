import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { updateMany, constructEvent } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  constructEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ order: { updateMany } }),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}));

function webhookRequest() {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "test-signature" },
    body: "{}",
  });
}

describe("Stripe webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-webhook-secret");
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          payment_status: "paid",
          metadata: { orderId: "order-1" },
        },
      },
    });
    updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid signature without updating an order", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("marks the matching pending order paid after a verified payment", async () => {
    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-1",
        stripeCheckoutSessionId: "cs_test_1",
        status: "PENDING",
      },
      data: { status: "PAID" },
    });
  });

  it("does not update an order for an unpaid checkout session", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1", payment_status: "unpaid", metadata: { orderId: "order-1" } } },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects a paid checkout event without its order reference", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1", payment_status: "paid", metadata: {} } },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns a retryable server error when the order update fails", async () => {
    updateMany.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
  });
});
