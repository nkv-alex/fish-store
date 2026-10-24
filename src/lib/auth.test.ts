import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeCredentials } from "./auth";

const { findUnique, comparePassword, consumeRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  comparePassword: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ compare: comparePassword }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ user: { findUnique } }),
}));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@next-auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn(() => ({})) }));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((provider) => provider),
}));
vi.mock("next-auth/providers/google", () => ({
  default: vi.fn((provider) => provider),
}));

describe("credential authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    findUnique.mockResolvedValue({
      id: "user-1",
      name: "Fish Buyer",
      email: "buyer@example.com",
      image: null,
      passwordHash: "stored-hash",
      isActive: true,
    });
    comparePassword.mockResolvedValue(true);
  });

  it("normalizes email, checks the rate limit, and verifies the password hash", async () => {
    const user = await authorizeCredentials({
      email: " BUYER@example.com ",
      password: "long-test-password",
    }, "192.0.2.1");

    expect(user).toEqual({
      id: "user-1",
      name: "Fish Buyer",
      email: "buyer@example.com",
      image: null,
    });
    expect(consumeRateLimit).toHaveBeenCalledWith({
      scope: "login",
      identifier: "buyer@example.com:192.0.2.1",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "buyer@example.com" } }),
    );
    expect(comparePassword).toHaveBeenCalledWith("long-test-password", "stored-hash");
  });

  it("rejects malformed credentials before accessing the database", async () => {
    await expect(
      authorizeCredentials({ email: "not-an-email", password: "secret" }),
    ).resolves.toBeNull();

    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects credentials after the rate limit is reached", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });

    await expect(
      authorizeCredentials({
        email: "buyer@example.com",
        password: "long-test-password",
      }, "192.0.2.1"),
    ).resolves.toBeNull();

    expect(findUnique).not.toHaveBeenCalled();
    expect(comparePassword).not.toHaveBeenCalled();
  });

  it("rejects inactive accounts and incorrect passwords", async () => {
    findUnique.mockResolvedValueOnce({
      id: "user-1",
      passwordHash: "stored-hash",
      isActive: false,
    });
    await expect(
      authorizeCredentials({ email: "buyer@example.com", password: "long-test-password" }),
    ).resolves.toBeNull();

    findUnique.mockResolvedValueOnce({
      id: "user-1",
      passwordHash: "stored-hash",
      isActive: true,
    });
    comparePassword.mockResolvedValueOnce(false);
    await expect(
      authorizeCredentials({ email: "buyer@example.com", password: "wrong-password" }),
    ).resolves.toBeNull();
  });
});
