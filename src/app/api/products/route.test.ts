import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { POST } from "../checkout/route";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    product: { findMany },
    order: { create: vi.fn(), update: vi.fn() },
  }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: vi.fn() } },
  })),
}));

describe("product and checkout API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active catalog products", async () => {
    findMany.mockResolvedValue([{ id: "product-1", name: "Ocean Blue Tee" }]);
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "product-1", name: "Ocean Blue Tee" },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  });

  it("rejects invalid checkout input before contacting services", async () => {
    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          items: [{ productId: "product-1", quantity: 1 }],
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Revisa el correo y los productos.",
    });
    expect(findMany).not.toHaveBeenCalled();
  });
});
