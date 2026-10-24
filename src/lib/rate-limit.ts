import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

const cleanupIntervalMs = 10 * 60 * 1000;
let lastCleanupAt = 0;
let cleanupPromise: Promise<void> | undefined;

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: RateLimitOptions): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = new Date();
  await cleanupExpiredBuckets(now);

  const key = createHash("sha256")
    .update(`${scope}:${identifier}`)
    .digest("hex");
  const cutoff = new Date(now.getTime() - windowMs);
  const expiresAt = new Date(now.getTime() + windowMs);
  const [bucket] = await getPrisma().$queryRaw<
    { attempts: number; windowStartedAt: Date }[]
  >`
    INSERT INTO "RateLimitBucket" ("key", "windowStartedAt", "attempts", "expiresAt")
    VALUES (${key}, ${now}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN "RateLimitBucket"."windowStartedAt" <= ${cutoff} THEN 1
        ELSE "RateLimitBucket"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "RateLimitBucket"."windowStartedAt" <= ${cutoff} THEN ${now}
        ELSE "RateLimitBucket"."windowStartedAt"
      END,
      "expiresAt" = CASE
        WHEN "RateLimitBucket"."windowStartedAt" <= ${cutoff} THEN ${expiresAt}
        ELSE "RateLimitBucket"."expiresAt"
      END
    RETURNING "attempts", "windowStartedAt"
  `;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.windowStartedAt.getTime() + windowMs - now.getTime()) / 1000),
  );
  return {
    allowed: bucket.attempts <= limit,
    retryAfterSeconds,
  };
}

async function cleanupExpiredBuckets(now: Date) {
  if (now.getTime() - lastCleanupAt < cleanupIntervalMs) return;
  if (cleanupPromise) return cleanupPromise;

  lastCleanupAt = now.getTime();
  cleanupPromise = getPrisma()
    .rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } })
    .then(() => undefined)
    .catch((error: unknown) => {
      lastCleanupAt = 0;
      console.error("Unable to clean expired rate-limit buckets:", error);
    })
    .finally(() => {
      cleanupPromise = undefined;
    });
  return cleanupPromise;
}
