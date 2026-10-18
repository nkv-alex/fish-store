import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to access the database.");
  }
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const hostname = new URL(connectionString).hostname;
  const adapter = hostname.endsWith(".neon.tech")
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString, max: getPoolMax() });

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return globalForPrisma.prisma;
}

function getPoolMax(): number {
  const poolMax = Number(process.env.DATABASE_POOL_MAX ?? "1");
  if (!Number.isSafeInteger(poolMax) || poolMax < 1 || poolMax > 100) {
    throw new Error("DATABASE_POOL_MAX must be an integer between 1 and 100.");
  }
  return poolMax;
}
