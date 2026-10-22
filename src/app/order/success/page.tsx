import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ClearCartOnSuccess } from "@/components/clear-cart-on-success";
import { isLocale, localeTags, translate } from "@/lib/i18n";
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

  const savedLocale = (await cookies()).get("fish-store-locale")?.value;
  const locale = isLocale(savedLocale) ? savedLocale : "es";
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const money = new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency: order.currency.toUpperCase(),
  });

  return (
    <main className="confirmation">
      <ClearCartOnSuccess />
      <a className="brand" href="/">pez<span>c</span>ado</a>
      <div className="confirmation-mark">✓</div>
      <p className="eyebrow">{t("paidEyebrow")}</p>
      <h1>{t("paidTitle")}</h1>
      <p className="confirmation-copy">{t("paidCopy")} <strong>{order.email}</strong>.</p>
      <div className="confirmation-order">
        <p>{t("orderNumber").replace("{id}", order.id.slice(-8).toUpperCase())}</p>
        {order.items.map((item) => (
          <p key={item.id}>{item.product.name} × {item.quantity}<span>{money.format((item.unitPrice * item.quantity) / 100)}</span></p>
        ))}
        <p className="confirmation-total">{t("total")}<span>{money.format(order.total / 100)}</span></p>
      </div>
      <Link className="checkout-button back-link" href="/">{t("backToStore")}</Link>
    </main>
  );
}
