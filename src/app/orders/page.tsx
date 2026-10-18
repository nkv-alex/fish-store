import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { StoreHeader } from "@/components/store-header";
import { cookies } from "next/headers";
import { isLocale, localeTags, translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) redirect("/account");

  const savedLocale = (await cookies()).get("fish-store-locale")?.value;
  const locale = isLocale(savedLocale) ? savedLocale : "es";
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

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
            <p className="eyebrow">{t("completedOrders")}</p>
            <h1>{t("myOrdersTitle")}</h1>
          </div>
          <p>{t("hello", { name: session.user.name || session.user.email || "" })}</p>
        </div>
        {orders.length === 0 ? (
          <div className="orders-empty">
            {t("noOrders")} <Link href="/#productos">{t("browseCatch")}</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const money = new Intl.NumberFormat(localeTags[locale], {
                style: "currency",
                currency: order.currency.toUpperCase(),
              });
              return (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <div>
                      <div className="order-number">{t("orderNumber", { id: order.id.slice(-8).toUpperCase() })}</div>
                      <div className="order-date">
                        {new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "long" }).format(order.createdAt)}
                      </div>
                    </div>
                    <span className={`order-status ${order.status.toLowerCase()}`}>
                      {t(order.status === "PENDING" ? "statusPending" : order.status === "PAID" ? "statusPaid" : "statusCancelled")}
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
                    <span>{t("total")}</span>
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
