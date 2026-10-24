import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ product: { findMany } }),
}));

describe("product API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
