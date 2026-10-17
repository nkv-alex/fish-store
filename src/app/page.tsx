import { getPrisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Shop from "./shop";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, session] = await Promise.all([
    getPrisma().product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        currency: true,
      },
    }),
    getServerSession(authOptions),
  ]);

  return (
    <Shop
      products={products}
      initialEmail={session?.user?.email ?? ""}
    />
  );
}
