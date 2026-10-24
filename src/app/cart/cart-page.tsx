"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/components/language-provider";
import { localeTags } from "@/lib/i18n";

export type CartProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
};

function formatPrice(price: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(price / 100);
}

export default function CartPage({
  products,
  isAuthenticated,
}: {
  products: CartProduct[];
  isAuthenticated: boolean;
}) {
  const { locale, t } = useLanguage();
  const {
    cart,
    count,
    removeFromCart,
    setQuantity,
    storageError,
  } = useCart();
  const [pending, setPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const productsById = new Map(products.map((product) => [product.id, product]));
  const unavailableItems = cart.filter((line) => !productsById.has(line.productId));
  const total = cart.reduce((sum, line) => {
    const product = productsById.get(line.productId);
    return sum + (product?.price ?? 0) * line.quantity;
  }, 0);
  const currency =
    productsById.get(cart[0]?.productId)?.currency ??
    products[0]?.currency ??
    "usd";

  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });
      const data: { url?: string; error?: string } = await response.json();
      if (response.status === 401) {
        window.location.assign("/account?callbackUrl=%2Fcart");
        return;
      }
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? t("checkoutError"));
      }
      window.location.assign(data.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : t("checkoutError"),
      );
      setPending(false);
    }
  }

  return (
    <main className="cart-page">
      <section className="cart-page-heading">
        <div>
          <h1>{t("cartTitle")}</h1>
          <p>{t("securePayment")}</p>
        </div>
        <Link href="/#productos" className="cart-continue-link">
          <span aria-hidden="true">←</span> {t("cartContinueShopping")}
        </Link>
      </section>

      <div className="cart-layout">
        <section className="cart-items-panel" aria-label={t("cartTitle")}>
          <div className="cart-items-heading">
            <h2>{t("cartTitle")}</h2>
            <span className="cart-item-count">{count}</span>
          </div>

          {storageError && (
            <p className="form-error" role="alert">
              {t(
                storageError === "restore"
                  ? "cartRestoreError"
                  : storageError === "session"
                    ? "cartSessionError"
                    : "cartSaveError",
              )}
            </p>
          )}

          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <span aria-hidden="true">◌</span>
              <p>{t("emptyCart")}</p>
              <Link href="/#productos" className="cart-continue-button">
                {t("cartContinueShopping")}
              </Link>
            </div>
          ) : (
            <ul className="cart-item-list">
              {cart.map((line) => {
                const product = productsById.get(line.productId);

                return (
                  <li className="cart-item" key={line.productId}>
                    {product ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="cart-item-image"
                          src={product.imageUrl}
                          alt=""
                        />
                        <div className="cart-item-details">
                          <h3>{product.name}</h3>
                          <p>{product.description}</p>
                          <div className="cart-quantity-control">
                            <button
                              type="button"
                              aria-label={t("cartDecreaseQuantity", {
                                name: product.name,
                              })}
                              disabled={line.quantity <= 1}
                              onClick={() =>
                                setQuantity(line.productId, line.quantity - 1)
                              }
                            >
                              −
                            </button>
                            <span>{line.quantity}</span>
                            <button
                              type="button"
                              aria-label={t("cartIncreaseQuantity", {
                                name: product.name,
                              })}
                              disabled={line.quantity >= 10}
                              onClick={() =>
                                setQuantity(line.productId, line.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="cart-item-price">
                          <strong>
                            {formatPrice(
                              product.price * line.quantity,
                              product.currency,
                              localeTags[locale],
                            )}
                          </strong>
                          <button
                            type="button"
                            onClick={() => removeFromCart(line.productId)}
                          >
                            {t("remove")}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="cart-unavailable-item">
                        <div>
                          <h3>{t("cartUnavailableProduct")}</h3>
                          <p>{t("cartUnavailableHint")}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(line.productId)}
                        >
                          {t("remove")}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="cart-summary">
          <h2>{t("cartSummary")}</h2>
          <div className="cart-summary-total">
            <span>{t("total")}</span>
            <strong>
              {formatPrice(total, currency, localeTags[locale])}
            </strong>
          </div>
          {cart.length > 0 && (
            <>
              {unavailableItems.length > 0 && (
                <p className="form-error" role="alert">
                  {t("cartUnavailableHint")}
                </p>
              )}
              {checkoutError && (
                <p className="form-error" role="alert">{checkoutError}</p>
              )}
              {isAuthenticated ? (
                <form onSubmit={checkout}>
                  <button
                    className="checkout-button"
                    disabled={pending || unavailableItems.length > 0}
                  >
                    {pending ? t("preparingPayment") : t("payWithStripe")}
                  </button>
                </form>
              ) : (
                <>
                  <p className="checkout-note">{t("accountRequired")}</p>
                  <Link
                    className="checkout-button account-checkout-link"
                    href="/account?callbackUrl=%2Fcart"
                  >
                    {t("signInOrRegister")}
                  </Link>
                </>
              )}
            </>
          )}
          <Link className="cart-orders-link" href="/orders">
            {t("myOrders")} <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </div>
    </main>
  );
}
