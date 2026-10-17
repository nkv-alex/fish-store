import { getPrisma } from "@/lib/prisma";
import Shop from "./shop";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPrisma().product.findMany({
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
  });

  return <Shop products={products} />;
}
