import { compare } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { findUnique, create } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findUnique, create },
  }),
}));

describe("account registration API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "user-1" });
  });

  it("stores a password hash and normalizes email addresses", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Fish Buyer",
          email: " BUYER@example.com ",
          password: "a-long-test-password",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledOnce();
    const createdUser = create.mock.calls[0][0].data;
    expect(createdUser.email).toBe("buyer@example.com");
    expect(createdUser.passwordHash).not.toBe("a-long-test-password");
    await expect(compare("a-long-test-password", createdUser.passwordHash)).resolves.toBe(true);
  });

  it("rejects weak passwords without querying the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Fish Buyer",
          email: "buyer@example.com",
          password: "short",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
