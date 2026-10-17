import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { StoreHeader } from "@/components/store-header";

export const dynamic = "force-dynamic";

const statusLabels = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
} as const;

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) redirect("/account");

  const orders = await getPrisma().order.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <StoreHeader />
      <main className="orders-page">
        <div className="orders-heading">
          <div>
            <p className="eyebrow">TU HISTORIAL DE COMPRAS (SIN PREGUNTAS)</p>
            <h1>Mis pedidos.</h1>
          </div>
          <p>Hola, {session.user.name || session.user.email}.</p>
        </div>
        {orders.length === 0 ? (
          <div className="orders-empty">
            Aún no hay pedidos asociados a tu cuenta. <Link href="/#productos">Echa un vistazo a la captura.</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const money = new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: order.currency.toUpperCase(),
              });
              return (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <div>
                      <div className="order-number">PEDIDO #{order.id.slice(-8).toUpperCase()}</div>
                      <div className="order-date">
                        {new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(order.createdAt)}
                      </div>
                    </div>
                    <span className={`order-status ${order.status.toLowerCase()}`}>
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <div className="order-items">
                    {order.items.map((item) => (
                      <div className="order-item" key={item.id}>
                        <span>{item.product.name} × {item.quantity}</span>
                        <span>{money.format((item.unitPrice * item.quantity) / 100)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="order-total">
                    <span>Total</span>
                    <strong>{money.format(order.total / 100)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
