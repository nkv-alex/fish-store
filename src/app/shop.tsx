"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StoreHeader } from "@/components/store-header";
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

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
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
          setError("No se pudo recuperar el carrito. Vuelve a añadir los productos.");
        }
        window.sessionStorage.removeItem("fish-store-cart");
      }
    } catch {
      setError("No se pudo recuperar el carrito de esta sesión.");
    }
  }, []);

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
      setError("No se pudo guardar el carrito. Inténtalo de nuevo antes de continuar.");
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
                        <span className="catch-status">RECIÉN INVENTADO</span>
                        <div className="fish-card-info">
                          <h3>{product.name}</h3>
                          <span className="fish-price">{formatPrice(product.price, product.currency)}</span>
                        </div>
                        <button
                          className="fish-card-add"
                          type="button"
                          aria-label={`Añadir ${product.name} a la captura`}
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
          <div className="checkout-form">
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
            <div className="cart-total"><span>Total</span><strong>{formatPrice(total, products.find((product) => product.id === cart[0]?.productId)?.currency ?? "usd")}</strong></div>
            {isAuthenticated ? (
              <form onSubmit={checkout}>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="checkout-button" disabled={pending}>
                  {pending ? "Preparando pago…" : "Pagar con Stripe"}
                </button>
              </form>
            ) : (
              <>
                <p className="checkout-note">Para comprar necesitas una cuenta. Inicia sesión o regístrate y volverás aquí con el carrito.</p>
                {error && <p className="form-error" role="alert">{error}</p>}
                <Link
                  className="checkout-button account-checkout-link"
                  href="/account?callbackUrl=%2F%23carrito"
                  onClick={(event) => {
                    if (!saveCartForAccount()) event.preventDefault();
                  }}
                >
                  Iniciar sesión o crear cuenta
                </Link>
              </>
            )}
          </div>
        )}
      </section>
      <footer>
        <Link className="brand" href="/">pez<span>c</span>ado</Link>
        <span>Producto fresco. Historia mejorada.</span>
        <span><Link href="/account">Tu cuenta</Link> · © 2026 Pezcado</span>
        <nav className="legal-links" aria-label="Información legal">
          <Link href="/privacy">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/terms">Términos de servicio</Link>
        </nav>
      </footer>
    </main>
  );
}
