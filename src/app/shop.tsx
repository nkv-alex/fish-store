"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StoreHeader } from "@/components/store-header";
import { useLanguage } from "@/components/language-provider";
import { localeTags } from "@/lib/i18n";
import { isValidCart, type CartLine } from "@/lib/cart";

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
};

function formatPrice(price: number, currency: string, locale: keyof typeof localeTags) {
  return new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(price / 100);
}

export default function Shop({
  products,
  isAuthenticated,
}: {
  products: ShopProduct[];
  isAuthenticated: boolean;
}) {
  const { locale, t } = useLanguage();
  const heroRef = useRef<HTMLElement>(null);
  const drumTrackRef = useRef<HTMLDivElement>(null);
  const drumAngleRef = useRef(0);
  const drumVelocityRef = useRef(-360 / 58);
  const drumDirectionRef = useRef(-1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const count = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  );
  const total = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const product = products.find((item) => item.id === line.productId);
        return sum + (product?.price ?? 0) * line.quantity;
      }, 0),
    [cart, products],
  );
  const featuredProducts = products.slice(0, 5);

  useEffect(() => {
    try {
      const savedCart = window.sessionStorage.getItem("fish-store-cart");
      if (savedCart) {
        const parsedCart: unknown = JSON.parse(savedCart);
        if (isValidCart(parsedCart)) {
          setCart(parsedCart);
        } else {
          setError(t("cartRestoreError"));
        }
        window.sessionStorage.removeItem("fish-store-cart");
      }
    } catch {
      setError(t("cartSessionError"));
    }
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateHeroOpacity = () => {
      if (motionPreference.matches) {
        heroRef.current?.style.setProperty("--hero-opacity", "1");
        heroRef.current?.style.setProperty("--hero-offset", "0px");
        heroRef.current?.style.setProperty("--hero-scale", "1");
        return;
      }
      const viewport = window.innerHeight || 1;
      const progress = Math.min(1, Math.max(0, (window.scrollY / viewport - 0.04) / 0.84));
      heroRef.current?.style.setProperty("--hero-opacity", String(1 - progress));
      heroRef.current?.style.setProperty("--hero-offset", `${progress * 64}px`);
      heroRef.current?.style.setProperty("--hero-scale", String(1 - progress * 0.035));
    };

    updateHeroOpacity();
    window.addEventListener("scroll", updateHeroOpacity, { passive: true });
    window.addEventListener("resize", updateHeroOpacity);
    motionPreference.addEventListener("change", updateHeroOpacity);
    return () => {
      window.removeEventListener("scroll", updateHeroOpacity);
      window.removeEventListener("resize", updateHeroOpacity);
      motionPreference.removeEventListener("change", updateHeroOpacity);
    };
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-scroll-reveal]");
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const track = drumTrackRef.current;
    if (!track) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let previousTime: number | undefined;

    function animate(time: number) {
      if (previousTime !== undefined) {
        const elapsed = Math.min((time - previousTime) / 1000, 0.05);
        const targetVelocity = drumDirectionRef.current * (360 / 58);
        const easing = 1 - Math.exp(-elapsed / 0.7);
        drumVelocityRef.current +=
          (targetVelocity - drumVelocityRef.current) * easing;
        drumAngleRef.current =
          (drumAngleRef.current + drumVelocityRef.current * elapsed) % 360;
        track?.style.setProperty(
          "--drum-angle",
          `${drumAngleRef.current}deg`,
        );
      }
      previousTime = time;
      if (!motionPreference.matches) {
        frameId = window.requestAnimationFrame(animate);
      }
    }

    function updateMotionPreference() {
      window.cancelAnimationFrame(frameId);
      previousTime = undefined;
      if (motionPreference.matches) {
        track?.style.removeProperty("--drum-angle");
        return;
      }
      frameId = window.requestAnimationFrame(animate);
    }

    updateMotionPreference();
    motionPreference.addEventListener("change", updateMotionPreference);
    return () => {
      window.cancelAnimationFrame(frameId);
      motionPreference.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  function updateDrumRotation(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !drumTrackRef.current) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    drumDirectionRef.current =
      event.clientX < bounds.left + bounds.width / 2 ? -1 : 1;
  }

  function resetDrumRotation() {
    drumDirectionRef.current = -1;
  }

  function addToCart(productId: string) {
    setError("");
    setCart((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) {
        return current.map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.min(line.quantity + 1, 10) }
            : line,
        );
      }
      return [...current, { productId, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((line) => line.productId !== productId));
  }

  function saveCartForAccount() {
    try {
      window.sessionStorage.setItem("fish-store-cart", JSON.stringify(cart));
      return true;
    } catch {
      setError(t("cartSaveError"));
      return false;
    }
  }

  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });
      const data: { url?: string; error?: string } = await response.json();
      if (response.status === 401 && saveCartForAccount()) {
        window.location.assign("/account?callbackUrl=%2F%23carrito");
        return;
      }
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? t("checkoutError"));
      }
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : t("checkoutError"),
      );
      setPending(false);
    }
  }

  return (
    <main>
      <StoreHeader count={count} />

      <section className="intro-scene">
        <section className="hero" ref={heroRef}>
          <div className="hero-content">
            <p className="eyebrow">{t("heroEyebrow")}</p>
            <p className="hero-edition">{t("heroEdition")}</p>
            <h1>{t("heroTitle")}</h1>
            <p className="hero-description">{t("heroDescription")}</p>
            <a className="hero-link" href="#productos">
              {t("viewCatch")} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-coordinate" aria-hidden="true">37°46&apos; N — 25°40&apos; W</div>
          <div className="hero-stamp" aria-hidden="true"><span>{t("stampTop")}</span><strong>{t("stampMiddle")}</strong><span>{t("stampBottom")}</span></div>
        </section>

        <section className="drum-section" id="productos" aria-labelledby="drum-title">
          <div className="section-heading drum-heading">
            <div>
              <p className="eyebrow">{t("catchEyebrow")}</p>
              <h2 id="drum-title">{t("catchTitle")}</h2>
            </div>
            <p>{t("catchHint")}</p>
          </div>

          {featuredProducts.length === 0 ? (
            <p className="empty-state">{t("emptyCatch")}</p>
          ) : (
            <div
              className="drum-scene"
              onPointerMove={updateDrumRotation}
              onPointerLeave={resetDrumRotation}
            >
              <div className="drum-track" ref={drumTrackRef}>
                {featuredProducts.map((product, index) => {
                  const angle = (360 * index) / featuredProducts.length;
                  return (
                    <article
                      className="fish-card"
                      key={product.id}
                      style={{ "--card-angle": `${angle}deg` } as React.CSSProperties}
                    >
                      <div className="fish-card-image">
                        {/* Seeded catalog images are served from public/. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.imageUrl} alt={product.name} />
                        <span className="catch-number">CAPTURA 0{index + 1}</span>
                        <span className="catch-status">{t("justInvented")}</span>
                        <div className="fish-card-info">
                          <h3>{product.name}</h3>
                          <span className="fish-price">{formatPrice(product.price, product.currency, locale)}</span>
                        </div>
                        <button
                          className="fish-card-add"
                          type="button"
                          aria-label={t("addCatch", { name: product.name })}
                          onClick={() => addToCart(product.id)}
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
          <p className="drum-footnote">{t("drumFootnote")}</p>
        </section>
      </section>

      <section className="collection" aria-labelledby="market-title" data-scroll-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("collectionEyebrow")}</p>
            <h2 id="market-title">{t("collectionTitle")}</h2>
          </div>
          <p>{t("collectionHint")}</p>
        </div>
        <div className="market-list">
          {products.map((product, index) => (
            <article className="market-row" key={product.id}>
              <span className="market-index">{String(index + 1).padStart(2, "0")}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="market-thumbnail" src={product.imageUrl} alt="" />
              <span className="market-name">{product.name}</span>
              <span className="market-detail">{product.description}</span>
              <span className="market-price">{formatPrice(product.price, product.currency, locale)}</span>
              <button className="market-add" onClick={() => addToCart(product.id)} aria-label={t("addCart", { name: product.name })}>+</button>
            </article>
          ))}
          {products.length === 0 && (
            <p className="empty-state">{t("emptyCollection")}</p>
          )}
        </div>
      </section>

      <section className="cart-section" id="carrito" aria-labelledby="cart-title" data-scroll-reveal>
        <div className="cart-panel">
          <div className="cart-panel-heading">
            <div>
              <p className="eyebrow">{t("trustTaste")}</p>
              <h2 id="cart-title">{t("cartTitle")} <span>({count})</span></h2>
              <p className="checkout-note">{t("securePayment")}</p>
            </div>
            <Link className="orders-shortcut" href="/orders">{t("myOrders")} <span aria-hidden="true">↗</span></Link>
          </div>
          {cart.length === 0 ? (
            <p className="empty-cart">{t("emptyCart")}</p>
          ) : (
            <div className="checkout-form">
            <ul className="cart-lines">
              {cart.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                if (!product) return null;
                return (
                  <li key={line.productId}>
                    <span>
                      {product.name} <span className="quantity">× {line.quantity}</span>
                      <button type="button" className="remove-item" onClick={() => removeFromCart(line.productId)}>{t("remove")}</button>
                    </span>
                    <span>{formatPrice(product.price * line.quantity, product.currency, locale)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="cart-total"><span>{t("total")}</span><strong>{formatPrice(total, products.find((product) => product.id === cart[0]?.productId)?.currency ?? "usd", locale)}</strong></div>
            {isAuthenticated ? (
              <form onSubmit={checkout}>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="checkout-button" disabled={pending}>
                  {pending ? t("preparingPayment") : t("payWithStripe")}
                </button>
              </form>
            ) : (
              <>
                <p className="checkout-note">{t("accountRequired")}</p>
                {error && <p className="form-error" role="alert">{error}</p>}
                <Link
                  className="checkout-button account-checkout-link"
                  href="/account?callbackUrl=%2F%23carrito"
                  onClick={(event) => {
                    if (!saveCartForAccount()) event.preventDefault();
                  }}
                >
                  {t("signInOrRegister")}
                </Link>
              </>
            )}
            </div>
          )}
        </div>
      </section>
      <footer>
        <Link className="brand" href="/">pez<span>c</span>ado</Link>
        <span>{t("productFresh")}</span>
        <span><Link href="/account">{t("yourAccount")}</Link> · © 2026 Pezcado</span>
        <nav className="legal-links" aria-label={t("privacy")}>
          <Link href="/privacy">{t("privacy")}</Link>
          <Link href="/cookies">{t("cookies")}</Link>
          <Link href="/terms">{t("terms")}</Link>
        </nav>
      </footer>
    </main>
  );
}
