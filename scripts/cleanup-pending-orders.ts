import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";

const pendingOrderMaxAgeMs = 24 * 60 * 60 * 1000;

async function main() {
  const prisma = getPrisma();
  try {
    const cutoff = new Date(Date.now() - pendingOrderMaxAgeMs);
    const result = await prisma.order.deleteMany({
      where: {
        status: "PENDING",
        createdAt: { lt: cutoff },
      },
    });
    console.info(
      `Deleted ${result.count} pending order(s) created before ${cutoff.toISOString()}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Pending order cleanup failed:", error);
  process.exitCode = 1;
});
