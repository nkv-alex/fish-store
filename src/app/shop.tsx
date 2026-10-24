"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart-provider";
import { StoreHeader } from "@/components/store-header";
import { useLanguage } from "@/components/language-provider";
import { localeTags } from "@/lib/i18n";

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
}: {
  products: ShopProduct[];
}) {
  const { locale, t } = useLanguage();
  const { addToCart } = useCart();
  const heroRef = useRef<HTMLElement>(null);
  const drumTrackRef = useRef<HTMLDivElement>(null);
  const drumAngleRef = useRef(0);
  const drumVelocityRef = useRef(-360 / 58);
  const drumDirectionRef = useRef(-1);
  const featuredProducts = products.slice(0, 5);

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

  return (
    <main>
      <StoreHeader />

      <section className="intro-scene">
        <section className="hero" ref={heroRef}>
          <div className="hero-content">
            <p className="eyebrow">{t("heroEyebrow")}</p>
            <h1>{t("heroTitle")}</h1>
            <p className="hero-description">{t("heroDescription")}</p>
            <a className="hero-link" href="#productos">
              {t("viewCatch")} <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section className="drum-section" id="productos" aria-labelledby="drum-title">
          <div className="section-heading drum-heading">
            <div>
              <h2 id="drum-title">{t("catchTitle")}</h2>
            </div>
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
        </section>
      </section>

      <section
        className="collection"
        id="lonja"
        aria-labelledby="market-title"
        data-scroll-reveal
      >
        <div className="section-heading">
          <h2 id="market-title">{t("collectionTitle")}</h2>
        </div>
        <div className="market-list">
          {products.map((product, index) => (
            <article className="market-card" key={product.id}>
              <div className="market-card-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.imageUrl} alt={product.name} />
                <span className="market-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <button
                  className="market-add"
                  type="button"
                  onClick={() => addToCart(product.id)}
                  aria-label={t("addCart", { name: product.name })}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
              <div className="market-card-info">
                <div className="market-card-title">
                  <h3>{product.name}</h3>
                  <span className="market-price">
                    {formatPrice(product.price, product.currency, locale)}
                  </span>
                </div>
                <p className="market-detail">{product.description}</p>
              </div>
            </article>
          ))}
          {products.length === 0 && (
            <p className="empty-state">{t("emptyCollection")}</p>
          )}
        </div>
      </section>

      <footer>
        <Link className="brand" href="/">pez<span>c</span>ado</Link>
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
