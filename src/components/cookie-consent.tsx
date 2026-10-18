"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Consent = "essential" | "all" | null;

const consentCookie = "fish-store-cookie-consent";

function readConsent(): Consent {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${consentCookie}=`))
    ?.split("=")[1];

  return value === "essential" || value === "all" ? value : null;
}

function writeConsent(consent: Exclude<Consent, null>) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${consentCookie}=${consent}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function CookieConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [metricsEnabled, setMetricsEnabled] = useState(false);

  useEffect(() => {
    const savedConsent = readConsent();
    setConsent(savedConsent);
    setMetricsEnabled(savedConsent === "all");
    setBannerOpen(savedConsent === null);
  }, []);

  useEffect(() => {
    if (consent !== "all" || !pathname) return;

    void fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch((error: unknown) => {
      console.error("Unable to send anonymous page metric:", error);
    });
  }, [consent, pathname]);

  function saveConsent(nextConsent: Exclude<Consent, null>) {
    writeConsent(nextConsent);
    setConsent(nextConsent);
    setMetricsEnabled(nextConsent === "all");
    setPreferencesOpen(false);
    setBannerOpen(false);
  }

  return (
    <>
      {!bannerOpen && (
        <button
          className="cookie-settings-trigger"
          type="button"
          onClick={() => {
            setMetricsEnabled(consent === "all");
            setPreferencesOpen(true);
            setBannerOpen(true);
          }}
        >
          Cookies
        </button>
      )}
      {bannerOpen && (
        <aside
          className="cookie-banner"
          aria-label="Preferencias de cookies"
          aria-live="polite"
        >
          <div className="cookie-banner-copy">
            <p className="cookie-banner-eyebrow">TÚ DECIDES</p>
            <h2 id="cookie-banner-title">Cookies con cabeza.</h2>
            <p>
              Usamos cookies necesarias para la sesión y tu cuenta. Si aceptas,
              también contaremos visitas de forma anónima para mejorar la tienda.
              Sin anuncios ni perfiles.
            </p>
            <Link href="/cookies">Lee la política de cookies</Link>
          </div>
          {preferencesOpen && (
            <div className="cookie-preferences">
              <p><strong>Necesarias</strong> — sesión y seguridad (siempre activas).</p>
              <label>
                <input
                  type="checkbox"
                  checked={metricsEnabled}
                  onChange={(event) => setMetricsEnabled(event.target.checked)}
                />
                <span>
                  <strong>Métricas anónimas</strong> — páginas visitadas, solo como
                  totales diarios; no guardamos IP, correo ni identificador de
                  cuenta en estas métricas.
                </span>
              </label>
            </div>
          )}
          <div className="cookie-banner-actions">
            {preferencesOpen ? (
              <>
                <button
                  className="cookie-button cookie-button-secondary"
                  type="button"
                  onClick={() => saveConsent("essential")}
                >
                  Solo necesarias
                </button>
                <button
                  className="cookie-button cookie-button-primary"
                  type="button"
                  onClick={() => saveConsent(metricsEnabled ? "all" : "essential")}
                >
                  Guardar selección
                </button>
              </>
            ) : (
              <>
                <button
                  className="cookie-button cookie-button-secondary"
                  type="button"
                  onClick={() => saveConsent("essential")}
                >
                  Solo necesarias
                </button>
                <button
                  className="cookie-button cookie-button-secondary"
                  type="button"
                  onClick={() => {
                    setMetricsEnabled(consent === "all");
                    setPreferencesOpen(true);
                  }}
                >
                  Preferencias
                </button>
                <button
                  className="cookie-button cookie-button-primary"
                  type="button"
                  onClick={() => saveConsent("all")}
                >
                  Aceptar todas
                </button>
              </>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
