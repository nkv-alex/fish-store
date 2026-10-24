import { afterEach, describe, expect, it, vi } from "vitest";
import { getTrustedClientIp } from "./client-ip";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("trusted proxy client IP", () => {
  it("ignores proxy headers unless explicitly enabled", () => {
    vi.stubEnv("TRUST_PROXY_IP_HEADERS", "false");

    expect(getTrustedClientIp((name) => name === "x-real-ip" ? "192.0.2.1" : null))
      .toBeNull();
  });

  it("uses a valid real IP from a trusted proxy", () => {
    vi.stubEnv("TRUST_PROXY_IP_HEADERS", "true");

    expect(getTrustedClientIp((name) => name === "x-real-ip" ? "192.0.2.1" : null))
      .toBe("192.0.2.1");
  });

  it("uses the final forwarded address only when it is a valid IP", () => {
    vi.stubEnv("TRUST_PROXY_IP_HEADERS", "true");

    expect(
      getTrustedClientIp((name) =>
        name === "x-forwarded-for" ? "198.51.100.4, 192.0.2.9" : null,
      ),
    ).toBe("192.0.2.9");
    expect(
      getTrustedClientIp((name) =>
        name === "x-real-ip" ? "spoofed.example" : null,
      ),
    ).toBeNull();
  });
});
