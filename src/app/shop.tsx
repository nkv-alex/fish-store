"use client";

import { useMemo, useState } from "react";
import type { CartLine } from "@/lib/cart";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
};

const formatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "USD",
});

export default function Shop({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [email, setEmail] = useState("");
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
      <header className="site-header">
        <a className="brand" href="#" aria-label="Marea, inicio">
          marea<span>.</span>
        </a>
        <a className="cart-link" href="#checkout">
          Tu bolsa <span>{count}</span>
        </a>
      </header>

      <section className="hero">
        <p className="eyebrow">COLECCIÓN 01 — HECHA PARA IR MÁS DESPACIO</p>
        <h1>Un poco de mar,<br />vayas donde vayas.</h1>
        <p>Objetos sencillos para días que se sienten un poco más largos.</p>
        <a className="hero-link" href="#productos">Descubrir la colección <span>↓</span></a>
      </section>

      <section className="collection" id="productos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PEQUEÑOS FAVORITOS</p>
            <h2>La colección</h2>
          </div>
          <p>Diseñados para acompañarte.</p>
        </div>
        {products.length === 0 ? (
          <p className="empty-state">No hay productos todavía. Ejecuta `npm run db:seed`.</p>
        ) : (
          <div className="product-grid">
            {products.map((product, index) => (
              <article className="product-card" key={product.id}>
                <div className={`product-image image-${index % 3}`}>
                  {/* Product imagery is served by the seed URLs, so remote images need no build-time config. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt={product.name} />
                  <span className="product-number">0{index + 1}</span>
                </div>
                <div className="product-info">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                  </div>
                  <span className="price">{formatter.format(product.price / 100)}</span>
                </div>
                <button className="add-button" onClick={() => addToCart(product.id)}>
                  Añadir a la bolsa <span>+</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="checkout-section" id="checkout">
        <div>
          <p className="eyebrow">CASI TUYO</p>
          <h2>Tu bolsa <span>({count})</span></h2>
          <p className="checkout-note">Pago seguro de prueba con Stripe Checkout.</p>
        </div>
        {cart.length === 0 ? (
          <p className="empty-cart">Tu bolsa está esperando su primer favorito.</p>
        ) : (
          <form className="checkout-form" onSubmit={checkout}>
            <ul className="cart-lines">
              {cart.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                if (!product) return null;
                return (
                  <li key={line.productId}>
                    <span>{product.name} <span className="quantity">× {line.quantity}</span></span>
                    <span>{formatter.format((product.price * line.quantity) / 100)}</span>
                  </li>
                );
              })}
            </ul>
            <label htmlFor="email">Correo para la confirmación</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
            />
            <div className="cart-total"><span>Total</span><strong>{formatter.format(total / 100)}</strong></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="checkout-button" disabled={pending}>
              {pending ? "Preparando pago…" : "Continuar al pago"}
            </button>
          </form>
        )}
      </section>
      <footer><a className="brand" href="#">marea<span>.</span></a><span>Hecho para los días sin prisa.</span><span>© 2026 Marea Store</span></footer>
    </main>
  );
}
