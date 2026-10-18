import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { cookieConsent, upsert } = vi.hoisted(() => ({
  cookieConsent: { value: "all" as string | undefined },
  upsert: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "fish-store-cookie-consent" && cookieConsent.value
        ? { value: cookieConsent.value }
        : undefined,
  }),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    dailyPageMetric: { upsert },
  }),
}));

describe("anonymous page metrics API", () => {
  beforeEach(() => {
    cookieConsent.value = "all";
    vi.clearAllMocks();
    upsert.mockResolvedValue({});
  });

  it("does not record metrics without optional-cookie consent", async () => {
    cookieConsent.value = "essential";
    const response = await POST(
      new Request("http://localhost/api/metrics", {
        method: "POST",
        body: JSON.stringify({ path: "/" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("increments an aggregate daily page counter after consent", async () => {
    const response = await POST(
      new Request("http://localhost/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/privacy" }),
      }),
    );

    expect(response.status).toBe(204);
    expect(upsert).toHaveBeenCalledWith({
      where: {
        day_path: { day: expect.any(Date), path: "/privacy" },
      },
      create: { day: expect.any(Date), path: "/privacy" },
      update: { views: { increment: 1 } },
    });
  });

  it("rejects paths outside the approved page list", async () => {
    const response = await POST(
      new Request("http://localhost/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/account?email=person@example.com" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});
