import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { findMany, createOrder, updateOrder, createStripeSession, getSession } =
  vi.hoisted(() => ({
    findMany: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    createStripeSession: vi.fn(),
    getSession: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    product: { findMany },
    order: { create: createOrder, update: updateOrder },
  }),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: createStripeSession } } }),
}));
vi.mock("next-auth", () => ({
  getServerSession: () => getSession(),
}));

function checkoutRequest(url = "http://localhost/api/checkout") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ productId: "product-1", quantity: 1 }] }),
  });
}

function configureValidCheckout() {
  getSession.mockResolvedValue({
    user: { id: "user-1", email: "account@example.com" },
  });
  findMany.mockResolvedValue([
    {
      id: "product-1",
      name: "Salmón de autor",
      description: "Captura de prueba",
      price: 3200,
      currency: "usd",
    },
  ]);
  createOrder.mockResolvedValue({ id: "order-1" });
  createStripeSession.mockResolvedValue({
    id: "cs_test_1",
    url: "https://checkout.stripe.com/session",
  });
}

describe("checkout API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid cart before contacting services", async () => {
    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("requires an authenticated customer", async () => {
    const response = await POST(checkoutRequest());

    expect(response.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("uses the configured public origin and cancellation page", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pezcado.example");
    configureValidCheckout();

    const response = await POST(checkoutRequest("https://pezcado.example/api/checkout"));

    expect(response.status).toBe(200);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "account@example.com",
          userId: "user-1",
          total: 3200,
        }),
      }),
    );
    expect(createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "https://pezcado.example/order/cancelled",
        success_url:
          "https://pezcado.example/order/success?session_id={CHECKOUT_SESSION_ID}",
      }),
    );
  });

  it("prefers the public auth URL over a localhost app URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_URL", "https://pezcado.example");
    configureValidCheckout();

    const response = await POST(checkoutRequest("https://pezcado.example/api/checkout"));

    expect(response.status).toBe(200);
    expect(createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "https://pezcado.example/order/cancelled",
      }),
    );
  });

  it("uses the Vercel deployment URL when configured URLs are localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_URL", "pezcado.example");
    configureValidCheckout();

    const response = await POST(checkoutRequest());

    expect(response.status).toBe(200);
    expect(createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "https://pezcado.example/order/cancelled",
      }),
    );
  });

  it("rejects production checkout with only localhost redirect URLs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_URL", "");
    getSession.mockResolvedValue({
      user: { id: "user-1", email: "account@example.com" },
    });

    const response = await POST(
      checkoutRequest("https://pezcado.example/api/checkout"),
    );

    expect(response.status).toBe(500);
    expect(findMany).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
    expect(createStripeSession).not.toHaveBeenCalled();
  });
});
