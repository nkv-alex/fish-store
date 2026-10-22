import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { POST } from "../checkout/route";

const { findMany, createOrder, updateOrder, createStripeSession, getSession } = vi.hoisted(() => ({
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
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: createStripeSession } },
  })),
}));

vi.mock("next-auth", () => ({
  getServerSession: () => getSession(),
}));

describe("product and checkout API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns active catalog products", async () => {
    findMany.mockResolvedValue([{ id: "product-1", name: "Salmón de autor" }]);
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "product-1", name: "Salmón de autor" },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  });

  it("rejects checkout without a valid cart before contacting services", async () => {
    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Revisa el correo y los productos.",
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects checkout for guests", async () => {
    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "product-1", quantity: 1 }],
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Inicia sesión o crea una cuenta para comprar.",
    });
    expect(findMany).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("returns to the home page when Stripe checkout is cancelled", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://fish-store-jet.vercel.app");
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

    const response = await POST(
      new Request("https://fish-store-jet.vercel.app/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "product-1", quantity: 1 }],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "account@example.com",
          userId: "user-1",
        }),
      }),
    );
    expect(createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "https://fish-store-jet.vercel.app/",
        success_url:
          "https://fish-store-jet.vercel.app/order/success?session_id={CHECKOUT_SESSION_ID}",
      }),
    );
  });

  it("uses the public auth URL instead of a localhost app URL for Stripe redirects", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_URL", "https://fish-store-jet.vercel.app");
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

    const response = await POST(
      new Request("https://fish-store-jet.vercel.app/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "product-1", quantity: 1 }],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "https://fish-store-jet.vercel.app/",
        success_url:
          "https://fish-store-jet.vercel.app/order/success?session_id={CHECKOUT_SESSION_ID}",
      }),
    );
  });

  it("uses the Vercel deployment URL when the configured URLs are localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_URL", "fish-store-jet.vercel.app");
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

    const response = await POST(
      new Request("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "product-1", quantity: 1 }],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "https://fish-store-jet.vercel.app/",
        success_url:
          "https://fish-store-jet.vercel.app/order/success?session_id={CHECKOUT_SESSION_ID}",
      }),
    );
  });

  it("rejects production checkout when only localhost redirect URLs are configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_URL", "");
    getSession.mockResolvedValue({
      user: { id: "user-1", email: "account@example.com" },
    });

    const response = await POST(
      new Request("https://fish-store-jet.vercel.app/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "product-1", quantity: 1 }],
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    });
    expect(findMany).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
    expect(createStripeSession).not.toHaveBeenCalled();
  });
});
