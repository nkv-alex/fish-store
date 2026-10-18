import "dotenv/config";
import { z } from "zod";
import { getPrisma } from "../src/lib/prisma";

async function main() {
  const parsedEmail = z.email().safeParse(process.argv[2]?.trim().toLowerCase());
  if (!parsedEmail.success) {
    throw new Error(
      "Provide an existing account email: npm run db:promote-admin -- admin@example.com",
    );
  }

  const prisma = getPrisma();
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: parsedEmail.data, mode: "insensitive" } },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new Error(`No account exists for ${parsedEmail.data}. Create it before promoting it.`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "ADMIN",
        isActive: true,
        authVersion: { increment: 1 },
      },
    });
    console.info(`Promoted ${user.email} to administrator. They must sign in again.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Unable to promote administrator account:", error);
  process.exitCode = 1;
});
