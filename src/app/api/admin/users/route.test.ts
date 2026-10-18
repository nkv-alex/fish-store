import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

const {
  getSession,
  findAdmin,
  findMany,
  countUsers,
  transaction,
  findActor,
  findTarget,
  countAdmins,
  updateUser,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  findAdmin: vi.fn(),
  findMany: vi.fn(),
  countUsers: vi.fn(),
  transaction: vi.fn(),
  findActor: vi.fn(),
  findTarget: vi.fn(),
  countAdmins: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: {
      findUnique: findAdmin,
      findMany,
      count: countUsers,
    },
    $transaction: transaction,
  }),
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({
  getServerSession: () => getSession(),
}));

const accountId = "cm1abcde00000000000000000";

describe("administrator account API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: { id: "admin-1" } });
    findAdmin.mockResolvedValue({ role: "ADMIN", isActive: true });
    findMany.mockResolvedValue([]);
    countUsers.mockResolvedValue(0);
    findActor.mockResolvedValue({ role: "ADMIN", isActive: true });
    findTarget.mockResolvedValue({ id: accountId, role: "USER", isActive: true });
    countAdmins.mockResolvedValue(2);
    updateUser.mockResolvedValue({
      id: accountId,
      role: "ADMIN",
      isActive: true,
    });
    transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          user: {
            findUnique: vi.fn(({ where }: { where: { id: string } }) =>
              where.id === "admin-1" ? findActor() : findTarget(),
            ),
            count: countAdmins,
            update: updateUser,
          },
        }),
    );
  });

  it("denies account listing to non-admin accounts", async () => {
    findAdmin.mockResolvedValue({ role: "USER", isActive: true });

    const response = await GET(new Request("http://localhost/api/admin/users"));

    expect(response.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("paginates and searches by name or email", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/users?q=ana&page=2"),
    );

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { email: { contains: "ana", mode: "insensitive" } },
            { name: { contains: "ana", mode: "insensitive" } },
          ],
        },
        skip: 25,
        take: 25,
      }),
    );
  });

  it("changes a role and invalidates that account's sessions", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "role",
          userId: accountId,
          role: "ADMIN",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: accountId },
      data: { role: "ADMIN", authVersion: { increment: 1 } },
      select: { id: true, role: true, isActive: true },
    });
    expect(transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
  });

  it("prevents removing the last active administrator", async () => {
    findTarget.mockResolvedValue({
      id: accountId,
      role: "ADMIN",
      isActive: true,
    });
    countAdmins.mockResolvedValue(1);
    const response = await PATCH(
      new Request("http://localhost/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          userId: accountId,
          isActive: false,
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("prevents administrators from changing their own role or status", async () => {
    findTarget.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      isActive: true,
    });
    const response = await PATCH(
      new Request("http://localhost/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "role",
          userId: "admin-1",
          role: "USER",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
