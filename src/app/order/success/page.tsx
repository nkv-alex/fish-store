import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) notFound();

  const order = await getPrisma().order.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: { items: { include: { product: true } } },
  });
  if (!order) notFound();

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (
    session.metadata?.orderId !== order.id ||
    session.payment_status !== "paid"
  ) {
    notFound();
  }

  if (order.status === "PENDING") {
    await getPrisma().order.updateMany({
      where: { id: order.id, stripeCheckoutSessionId: session.id, status: "PENDING" },
      data: { status: "PAID" },
    });
  }

  const money = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: order.currency.toUpperCase(),
  });

  return (
    <main className="confirmation">
      <a className="brand" href="/">marea<span>.</span></a>
      <div className="confirmation-mark">✓</div>
      <p className="eyebrow">PAGO CONFIRMADO</p>
      <h1>Gracias por elegir<br />un poco de mar.</h1>
      <p className="confirmation-copy">Enviaremos los detalles de tu pedido a <strong>{order.email}</strong>.</p>
      <div className="confirmation-order">
        <p>Pedido <span>#{order.id.slice(-8).toUpperCase()}</span></p>
        {order.items.map((item) => (
          <p key={item.id}>{item.product.name} × {item.quantity}<span>{money.format((item.unitPrice * item.quantity) / 100)}</span></p>
        ))}
        <p className="confirmation-total">Total<span>{money.format(order.total / 100)}</span></p>
      </div>
      <Link className="checkout-button back-link" href="/">Volver a la tienda</Link>
    </main>
  );
}
