"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StoreHeader } from "@/components/store-header";
import type { CartLine } from "@/lib/cart";

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(price / 100);
}

export default function Shop({
  products,
  initialEmail,
}: {
  products: ShopProduct[];
  initialEmail: string;
}) {
  const heroRef = useRef<HTMLElement>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [email, setEmail] = useState(initialEmail);
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
    const updateHeroOpacity = () => {
      const viewport = window.innerHeight || 1;
      const progress = Math.min(1, Math.max(0, (window.scrollY / viewport - 0.12) / 0.78));
      heroRef.current?.style.setProperty("--hero-opacity", String(1 - progress));
    };

    updateHeroOpacity();
    window.addEventListener("scroll", updateHeroOpacity, { passive: true });
    window.addEventListener("resize", updateHeroOpacity);
    return () => {
      window.removeEventListener("scroll", updateHeroOpacity);
      window.removeEventListener("resize", updateHeroOpacity);
    };
  }, []);

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

  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, items: cart }),
      });
      const data: { url?: string; error?: string } = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "No se pudo iniciar el pago.");
      }
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "No se pudo iniciar el pago.",
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
            <p className="eyebrow">PESCADERÍA FINA · PROCEDENCIA CUESTIONABLE</p>
            <p className="hero-edition">TEMPORADA 2026 <span>—</span> CAPTURA Nº 001</p>
            <h1>Del mar.<br />Más o menos.</h1>
            <p className="hero-description">
              Pescado tan fresco que todavía no sabe que está en internet.
            </p>
            <a className="hero-link" href="#productos">
              Ver la captura <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-coordinate" aria-hidden="true">37°46&apos; N — 25°40&apos; W</div>
          <div className="hero-stamp" aria-hidden="true"><span>NO PREGUNTES</span><strong>FRESCO</strong><span>CASI SIEMPRE</span></div>
        </section>

        <section className="drum-section" id="productos" aria-labelledby="drum-title">
          <div className="section-heading drum-heading">
            <div>
              <p className="eyebrow">PESCADO DEL DÍA · MÁS O MENOS</p>
              <h2 id="drum-title">La captura.</h2>
            </div>
            <p>Gira lento. Como debe ser el pescado bueno.</p>
          </div>

          {featuredProducts.length === 0 ? (
            <p className="empty-state">Hoy no ha picado nada. Vuelve cuando el mar coopere.</p>
          ) : (
            <div className="drum-scene">
              <div className="drum-track">
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
                        <span className="catch-status">RECIÉN INVENTADO</span>
                      </div>
                      <div className="fish-card-body">
                        <div className="fish-card-title">
                          <div>
                            <p className="fish-origin">ATLÁNTICO · ESO DICE LA ETIQUETA</p>
                            <h3>{product.name}</h3>
                          </div>
                          <span className="fish-price">{formatPrice(product.price, product.currency)}</span>
                        </div>
                        <p className="fish-description">{product.description}</p>
                        <button className="add-button" onClick={() => addToCart(product.id)}>
                          Añadir a la captura <span aria-hidden="true">+</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
          <p className="drum-footnote">Rotación lenta para no marear a los peces. Ni a ti.</p>
        </section>
      </section>

      <section className="collection" aria-labelledby="market-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PESCA RESPONSABLEMENTE DUDOSA</p>
            <h2 id="market-title">La lonja.</h2>
          </div>
          <p>Precios honestos. El pescado, no prometemos.</p>
        </div>
        <div className="market-list">
          {products.map((product, index) => (
            <article className="market-row" key={product.id}>
              <span className="market-index">{String(index + 1).padStart(2, "0")}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="market-thumbnail" src={product.imageUrl} alt="" />
              <span className="market-name">{product.name}</span>
              <span className="market-detail">{product.description}</span>
              <span className="market-price">{formatPrice(product.price, product.currency)}</span>
              <button className="market-add" onClick={() => addToCart(product.id)} aria-label={`Añadir ${product.name} al carrito`}>+</button>
            </article>
          ))}
          {products.length === 0 && (
            <p className="empty-state">La lonja está vacía. Será cosa de la marea.</p>
          )}
        </div>
      </section>

      <section className="checkout-section" id="carrito" aria-labelledby="cart-title">
        <div>
          <p className="eyebrow">CONFIAMOS EN TU CRITERIO</p>
          <h2 id="cart-title">El carrito <span>({count})</span></h2>
          <p className="checkout-note">Pago seguro con Stripe. La procedencia queda entre nosotros.</p>
          <Link className="orders-shortcut" href="/orders">Consultar mis pedidos <span aria-hidden="true">↗</span></Link>
        </div>
        {cart.length === 0 ? (
          <p className="empty-cart">Todavía no hay nada en el hielo.</p>
        ) : (
          <form className="checkout-form" onSubmit={checkout}>
            <ul className="cart-lines">
              {cart.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                if (!product) return null;
                return (
                  <li key={line.productId}>
                    <span>
                      {product.name} <span className="quantity">× {line.quantity}</span>
                      <button type="button" className="remove-item" onClick={() => removeFromCart(line.productId)}>Quitar</button>
                    </span>
                    <span>{formatPrice(product.price * line.quantity, product.currency)}</span>
                  </li>
                );
              })}
            </ul>
            {!initialEmail && (
              <>
                <label htmlFor="email">Correo para el recibo (si lo necesitas)</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@correo.com"
                />
                <p className="guest-note">¿Quieres ver el pedido después? <Link href="/account">Crea una cuenta</Link>.</p>
              </>
            )}
            <div className="cart-total"><span>Total</span><strong>{formatPrice(total, products.find((product) => product.id === cart[0]?.productId)?.currency ?? "usd")}</strong></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="checkout-button" disabled={pending}>
              {pending ? "Preparando pago…" : "Pagar con Stripe"}
            </button>
          </form>
        )}
      </section>
      <footer>
        <Link className="brand" href="/">pez<span>c</span>ado</Link>
        <span>Producto fresco. Historia mejorada.</span>
        <span><Link href="/account">Tu cuenta</Link> · © 2026 Pezcado</span>
      </footer>
    </main>
  );
}
