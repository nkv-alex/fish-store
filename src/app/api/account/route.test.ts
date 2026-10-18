import { hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

const { getSession, findUser, updateUser, updateOrders, deleteUser, transaction } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    findUser: vi.fn(),
    updateUser: vi.fn(),
    updateOrders: vi.fn(),
    deleteUser: vi.fn(),
    transaction: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findUnique: findUser, update: updateUser, delete: deleteUser },
    $transaction: transaction,
  }),
}));

vi.mock("next-auth", () => ({
  getServerSession: () => getSession(),
}));

describe("account management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    findUser.mockResolvedValue({
      id: "user-1",
      name: "Buyer",
      email: "buyer@example.com",
      passwordHash: null,
    });
    updateUser.mockResolvedValue({ name: "Updated Buyer" });
    updateOrders.mockResolvedValue({ count: 2 });
    deleteUser.mockResolvedValue({});
    transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<void>) =>
        callback({
          order: { updateMany: updateOrders },
          user: { delete: deleteUser },
        }),
    );
  });

  it("requires an authenticated user", async () => {
    getSession.mockResolvedValue(null);
    const response = await PATCH(
      new Request("http://localhost/api/account", {
        method: "PATCH",
        body: JSON.stringify({ action: "profile", name: "Buyer" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the profile name without allowing an email change", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", name: "Updated Buyer" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Updated Buyer" },
      select: { name: true },
    });
  });

  it("requires the current password before changing a password account", async () => {
    findUser.mockResolvedValue({
      id: "user-1",
      name: "Buyer",
      email: "buyer@example.com",
      passwordHash: await hash("old-password-is-long", 4),
    });
    const response = await PATCH(
      new Request("http://localhost/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "password",
          currentPassword: "wrong-password",
          newPassword: "new-password-is-long",
          confirmPassword: "new-password-is-long",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("changes a password and increments the shared session version", async () => {
    findUser.mockResolvedValue({
      id: "user-1",
      name: "Buyer",
      email: "buyer@example.com",
      passwordHash: await hash("old-password-is-long", 4),
    });
    const response = await PATCH(
      new Request("http://localhost/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "password",
          currentPassword: "old-password-is-long",
          newPassword: "new-password-is-long",
          confirmPassword: "new-password-is-long",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: expect.any(String),
        authVersion: { increment: 1 },
      },
    });
  });

  it("anonymizes retained orders before deleting an OAuth account", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: "ELIMINAR",
          confirmEmail: "BUYER@example.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateOrders).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        userId: null,
        email: "deleted-account@privacy.invalid",
      },
    });
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });
});
