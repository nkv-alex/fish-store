import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as live } from "./live/route";
import { GET as ready } from "./ready/route";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ $queryRaw: query }),
}));

describe("health endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.mockResolvedValue([{ "?column?": 1 }]);
  });

  it("reports liveness without a database check", async () => {
    const response = live();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(query).not.toHaveBeenCalled();
  });

  it("reports readiness only when the database query succeeds", async () => {
    const response = await ready();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
  });

  it("returns 503 when the database is unavailable", async () => {
    const error = new Error("database unavailable");
    query.mockRejectedValue(error);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await ready();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_ready" });
    expect(consoleError).toHaveBeenCalledWith(
      "Application readiness check failed:",
      error,
    );
    consoleError.mockRestore();
  });
});
