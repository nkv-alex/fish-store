import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeRateLimit } from "./rate-limit";

const { queryRaw, deleteMany } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    $queryRaw: queryRaw,
    rateLimitBucket: { deleteMany },
  }),
}));

describe("database-backed rate limiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteMany.mockResolvedValue({ count: 0 });
  });

  it("stores a hashed key and allows requests up to the configured limit", async () => {
    queryRaw.mockResolvedValue([{ attempts: 2, windowStartedAt: new Date() }]);

    const result = await consumeRateLimit({
      scope: "chat",
      identifier: "192.0.2.1",
      limit: 2,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(true);
    expect(queryRaw.mock.calls[0][1]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks attempts over the limit and returns a retry delay", async () => {
    queryRaw.mockResolvedValue([
      { attempts: 11, windowStartedAt: new Date(Date.now() - 2_000) },
    ]);

    const result = await consumeRateLimit({
      scope: "login",
      identifier: "buyer@example.com:192.0.2.1",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(queryRaw).toHaveBeenCalledOnce();
  });
});
