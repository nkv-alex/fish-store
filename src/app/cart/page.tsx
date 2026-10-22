import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import CartPage from "./cart-page";

export const metadata: Metadata = {
  title: "Carrito | Pezcado",
  description: "Revisa tu carrito y continúa al pago seguro.",
};

export const dynamic = "force-dynamic";

export default async function CartRoute() {
  const [products, session] = await Promise.all([
    getPrisma().product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
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
    <>
      <StoreHeader />
      <CartPage
        products={products}
        isAuthenticated={Boolean(session?.user?.id)}
      />
    </>
  );
}
