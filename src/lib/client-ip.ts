import { isIP } from "node:net";

export function getTrustedClientIp(
  readHeader: (name: string) => string | null | undefined,
): string | null {
  if (process.env.TRUST_PROXY_IP_HEADERS !== "true") return null;

  const realIp = readHeader("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwardedFor = readHeader("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",").at(-1)?.trim();
  return forwardedIp && isIP(forwardedIp) ? forwardedIp : null;
}
