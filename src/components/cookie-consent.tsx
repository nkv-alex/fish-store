"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";

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
  const { t } = useLanguage();
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
          {t("cookies")}
        </button>
      )}
      {bannerOpen && (
        <aside
          className="cookie-banner"
          aria-label={t("cookiePrefs")}
          aria-live="polite"
        >
          <div className="cookie-banner-copy">
            <p className="cookie-banner-eyebrow">{t("youDecide")}</p>
            <h2 id="cookie-banner-title">{t("cookieTitle")}</h2>
            <p>{t("cookieCopy")}</p>
            <Link href="/cookies">{t("readCookiePolicy")}</Link>
          </div>
          {preferencesOpen && (
            <div className="cookie-preferences">
              <p><strong>{t("necessary")}</strong> — {t("necessaryDescription")}</p>
              <label>
                <input
                  type="checkbox"
                  checked={metricsEnabled}
                  onChange={(event) => setMetricsEnabled(event.target.checked)}
                />
                <span>
                  <strong>{t("anonymousMetrics")}</strong> — {t("metricsDescription")}
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
                  {t("necessaryOnly")}
                </button>
                <button
                  className="cookie-button cookie-button-primary"
                  type="button"
                  onClick={() => saveConsent(metricsEnabled ? "all" : "essential")}
                >
                  {t("saveSelection")}
                </button>
              </>
            ) : (
              <>
                <button
                  className="cookie-button cookie-button-secondary"
                  type="button"
                  onClick={() => saveConsent("essential")}
                >
                  {t("necessaryOnly")}
                </button>
                <button
                  className="cookie-button cookie-button-secondary"
                  type="button"
                  onClick={() => {
                    setMetricsEnabled(consent === "all");
                    setPreferencesOpen(true);
                  }}
                >
                  {t("preferences")}
                </button>
                <button
                  className="cookie-button cookie-button-primary"
                  type="button"
                  onClick={() => saveConsent("all")}
                >
                  {t("acceptAll")}
                </button>
              </>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
